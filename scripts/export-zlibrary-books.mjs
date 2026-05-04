#!/usr/bin/env node

/**
 * Z-Library 个人书库书目导出脚本（第二版：自动检测 + 点击下一页）
 *
 * 用法：
 *   npm run sync:books:zlibrary
 *
 * 流程：
 *   1. 打开浏览器 → 用户手动登录并进入书库页面
 *   2. 脚本自动检测到书籍列表后开始抓取
 *   3. 每页抓完后自动点击"下一页"按钮
 *   4. 找不到下一页时停止
 */

import { chromium } from "playwright";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUTPUT_DIR = join(ROOT, "output");
const PROFILE_DIR = join(ROOT, ".playwright-zlibrary-profile");
const START_URL = "https://z-library.sk/";
const MAX_PAGES = 18;
const WAIT_TIMEOUT_MS = 300_000; // 5 分钟等待用户导航
const POLL_INTERVAL_MS = 5_000; // 每 5 秒检测一次
const MAX_RETRIES_PER_PAGE = 2;

// ── 工具函数 ──────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function now() {
  return new Date().toISOString();
}

// ── 判断当前页面是否包含书籍列表 ─────────────────────
async function detectLibrary(page) {
  return page.evaluate(() => {
    const bodyText = document.body?.innerText || "";
    const url = location.href;

    // 排除首页（pathname 只有 / 或空）
    const path = new URL(url).pathname.replace(/\/$/, "");
    if (!path || path === "") return false;

    // 排除明显非书库页面
    if (/你要找的页面不存在|Page.*doesn.*exist/i.test(bodyText.slice(0, 300))) {
      return false;
    }

    // 1. 查找 <z-bookcard> 自定义元素（Z-Library 的书籍卡片）
    const bookcards = document.querySelectorAll("z-bookcard");
    if (bookcards.length >= 2) return true;

    // 2. 查找包含书籍卡片的已知容器
    const cardSelectors = [
      ".resItemBoxBooks",
      ".book-item",
      ".resItemBox",
      ".bookRow",
      "article.book",
      ".book-item",
      ".book-card",
    ];
    for (const sel of cardSelectors) {
      const els = document.querySelectorAll(sel);
      if (els.length >= 3) return true;
    }

    // 3. URL 包含 profile + 页面标题含 "My Library"
    const urlHints = /profile|booklist|mylibrary|download.?history|favorites|shelf/i;
    if (urlHints.test(url) && /my library|books in my library/i.test(bodyText.slice(0, 2000))) {
      return true;
    }

    // 4. URL 包含书库关键词 + 有足够 /book/ 链接
    if (urlHints.test(url)) {
      const bookLinks = document.querySelectorAll("a[href*='/book/']");
      if (bookLinks.length >= 5 && bodyText.length > 1000) return true;
    }

    return false;
  });
}

// ── 从当前页面提取书籍 ───────────────────────────────
async function extractBooks(page) {
  return page.evaluate(() => {
    const results = [];

    // 策略 A：提取 <z-bookcard> 元素（Z-Library 当前使用的自定义元素）
    const bookcards = document.querySelectorAll("z-bookcard");
    if (bookcards.length >= 1) {
      for (const card of bookcards) {
        // 从 slot 子元素获取标题和作者
        const titleEl = card.querySelector('div[slot="title"]');
        const authorEl = card.querySelector('div[slot="author"]');
        const title = titleEl?.textContent?.trim() || "";
        const author = authorEl?.textContent?.trim() || "";

        if (!title) continue;

        // 从属性获取其他字段
        const rawHref = card.getAttribute("href") || "";
        const sourceUrl = rawHref.startsWith("http")
          ? rawHref
          : rawHref
            ? `https://z-library.sk${rawHref}`
            : "";
        const year = card.getAttribute("year") || "";
        const language = card.getAttribute("language") || "";
        const extension = card.getAttribute("extension") || "";

        results.push({
          title: title,
          author: author,
          year: year,
          language: language,
          extension: extension,
          sourceUrl: sourceUrl,
          page: 0,
          source: "zlibrary-library",
          status: "已下载/待读",
        });
      }
      if (results.length > 0) return results;
    }

    // 策略 B：提取 <z-cover> 元素（booklists 中使用）
    const covers = document.querySelectorAll("z-cover");
    if (covers.length >= 1) {
      for (const cover of covers) {
        const title = cover.getAttribute("title")?.trim() || "";
        const author = cover.getAttribute("author")?.trim() || "";
        if (!title) continue;

        // 找父级 <a> 链接
        const parentA = cover.closest("a");
        const rawHref = parentA?.getAttribute("href") || "";
        const sourceUrl = rawHref.startsWith("http")
          ? rawHref
          : rawHref
            ? `https://z-library.sk${rawHref}`
            : "";

        results.push({
          title: title,
          author: author,
          year: "",
          language: "",
          extension: "",
          sourceUrl: sourceUrl,
          page: 0,
          source: "zlibrary-library",
          status: "已下载/待读",
        });
      }
      if (results.length > 0) return results;
    }

    // 策略 C：通用 /book/ 链接回退
    const items = document.querySelectorAll(".book-item, .resItemBoxBooks, .resItemBox");
    if (items.length >= 2) {
      for (const el of items) {
        const text = (el.textContent || "").trim();
        if (text.length < 10) continue;

        const links = el.querySelectorAll("a");
        let title = "";
        let sourceUrl = "";
        for (const a of links) {
          const href = a.getAttribute("href") || "";
          const linkText = (a.textContent || "").trim();
          if (
            linkText.length > 3 &&
            !/^\d+$/.test(linkText) &&
            !/next|prev|page|download|remove|delete|more|details/i.test(linkText)
          ) {
            if (!title || linkText.length > title.length) {
              title = linkText;
            }
          }
          if (href.includes("/book/") && !sourceUrl) {
            sourceUrl = href.startsWith("http")
              ? href
              : `https://z-library.sk${href}`;
          }
        }
        if (!title) continue;

        results.push({
          title: title.trim(),
          author: "",
          year: "",
          language: "",
          extension: "",
          sourceUrl: sourceUrl.trim(),
          page: 0,
          source: "zlibrary-library",
          status: "已下载/待读",
        });
      }
    }

    return results;
  });
}

// ── 查找下一页按钮 ──────────────────────────────────
async function findNextPageButton(page) {
  return page.evaluate(() => {
    // 1. 查找 paginator 中的下一页链接（Z-Library 专用）
    const paginator = document.querySelector(".paginator, .paginator_mylibrary, [class*='paginator']");
    if (paginator) {
      const nextLink = paginator.querySelector("a[href*='page=']");
      if (nextLink && !nextLink.classList.contains("disabled")) {
        const txt = (nextLink.textContent || "").trim().toLowerCase();
        if (/next|›|»|下一页/.test(txt)) return true;
      }
    }

    // 2. 通用文本搜索
    const texts = ["next page", "next", "下一页", "›", "»", "next ›"];
    const allLinks = Array.from(document.querySelectorAll("a, button, span"));
    for (const el of allLinks) {
      const txt = (el.textContent || "").trim().toLowerCase();
      for (const t of texts) {
        if (txt === t || txt.includes(t)) {
          if (!el.disabled && !el.classList.contains("disabled")) {
            return true;
          }
        }
      }
    }
    return false;
  });
}

async function clickNextPage(page) {
  // 先尝试 paginator 里的链接
  let clicked = await page.evaluate(() => {
    const paginator = document.querySelector(".paginator, .paginator_mylibrary, [class*='paginator']");
    if (paginator) {
      const nextLink = paginator.querySelector("a[href*='page=']");
      if (nextLink && !nextLink.classList.contains("disabled")) {
        const txt = (nextLink.textContent || "").trim().toLowerCase();
        if (/next|›|»|下一页/.test(txt)) {
          nextLink.click();
          return true;
        }
      }
    }
    return false;
  });

  if (!clicked) {
    // 回退：通用文本搜索
    clicked = await page.evaluate(() => {
      const texts = ["next page", "next", "下一页", "›", "»", "next ›"];
      const allLinks = Array.from(document.querySelectorAll("a, button, span"));
      for (const el of allLinks) {
        const txt = (el.textContent || "").trim().toLowerCase();
        for (const t of texts) {
          if (
            (txt === t || txt.includes(t)) &&
            !el.disabled &&
            !el.classList.contains("disabled")
          ) {
            el.click();
            return true;
          }
        }
      }
      return false;
    });
  }

  return clicked;
}

// ── 去重 ──────────────────────────────────────────────
function deduplicate(books) {
  const seen = new Set();
  return books.filter((b) => {
    const key = `${(b.title || "").trim()}|${(b.author || "").trim()}|${(b.sourceUrl || "").trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── 保存 debug HTML ──────────────────────────────────
async function saveDebug(page, filename) {
  const html = await page.content().catch(() => "");
  writeFileSync(join(OUTPUT_DIR, filename), html, "utf-8");
  console.log(`  debug 文件已保存: output/${filename}`);
}

// ── 主流程 ────────────────────────────────────────────
async function main() {
  console.log("[ZLibrary] browser opened\n");

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    locale: "zh-CN",
  });

  const page = await context.newPage();

  // ── 第一步：等待用户手动导航到书库 ─────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("请在浏览器中手动操作：");
  console.log("  1. 登录 Z-Library");
  console.log("  2. 进入「我的图书馆 / My Library / Booklist」");
  console.log("  3. 确保页面显示书籍列表");
  console.log("");
  console.log("脚本每 5 秒自动检测页面，发现书籍列表后立即开始抓取。");
  console.log("（最多等待 5 分钟）");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await page.goto(START_URL, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {
    console.log("[ZLibrary] 首页加载较慢，不妨碍后续操作\n");
  });

  console.log("[ZLibrary] waiting for user to open library page...\n");

  const startTime = Date.now();
  let libraryDetected = false;

  while (Date.now() - startTime < WAIT_TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS);

    const currentUrl = page.url();
    console.log(`[ZLibrary] current url: ${currentUrl.slice(0, 100)}`);

    try {
      const detected = await detectLibrary(page);
      if (detected) {
        libraryDetected = true;
        console.log("\n[ZLibrary] library detected, start scraping\n");
        break;
      }
    } catch (e) {
      // 页面跳转时 evaluate 上下文被销毁，忽略并继续等待
      continue;
    }

    // 额外的检测：是否有多个书籍链接
    try {
      const linkCount = await page.evaluate(() => {
        return document.querySelectorAll("a[href*='/book/']").length;
      });
      if (linkCount > 0) {
        console.log(`[ZLibrary] candidate book links: ${linkCount}`);
      }
    } catch {
      // 忽略导航导致的错误
    }
  }

  if (!libraryDetected) {
    console.log("\n⚠ 5 分钟内未检测到书籍列表。保存当前页面用于调试。");
    await saveDebug(page, "zlibrary-login-debug.html");
    console.log("请把 output/zlibrary-login-debug.html 发给 ChatGPT 分析选择器。");
    await context.close();
    process.exit(1);
  }

  // ── 第二步：逐页抓取（点击下一页） ─────────────────
  const allBooks = [];
  const failedPages = [];
  let pagesScanned = 0;

  for (let p = 1; p <= MAX_PAGES; p++) {
    // 在第一页之后点击下一页
    if (p > 1) {
      try {
        const hasNext = await findNextPageButton(page);
        if (!hasNext) {
          console.log("[ZLibrary] no next page found, stop");
          break;
        }
        const clicked = await clickNextPage(page);
        if (!clicked) {
          console.log("[ZLibrary] failed to click next page, stop");
          break;
        }
        console.log("[ZLibrary] next page clicked, waiting for content...");
        // 等待 AJAX 加载完成：检测 z-bookcard 或 book-item 数量变化
        await sleep(2000);
        try {
          await page.waitForFunction(
            () => {
              const cards = document.querySelectorAll("z-bookcard");
              const items = document.querySelectorAll(".book-item, .resItemBoxBooks");
              return cards.length > 0 || items.length > 0;
            },
            { timeout: 15000 }
          );
        } catch {
          console.log("  ⚠ timeout waiting for content, trying anyway");
        }
        await sleep(1000);
      } catch (e) {
        console.log(`[ZLibrary] error during pagination: ${e.message}`);
        break;
      }
    }

    // 重试提取
    let books = [];
    for (let retry = 0; retry < MAX_RETRIES_PER_PAGE; retry++) {
      if (retry > 0) {
        console.log(`  retry ${retry}...`);
        await sleep(2000);
      }
      try {
        books = await extractBooks(page);
        if (books.length > 0) break;
      } catch (e) {
        console.log(`  extract error: ${e.message}`);
      }
    }

    console.log(`[ZLibrary] page ${p}: extracted ${books.length} books`);

    if (books.length === 0) {
      console.log("  ⚠ no books found on this page");
      await saveDebug(page, "zlibrary-page-debug.html");
      console.log("  请把 output/zlibrary-page-debug.html 发给 ChatGPT 分析选择器。");
      failedPages.push(p);
      continue;
    }

    for (const b of books) {
      b.page = p;
    }
    allBooks.push(...books);
    pagesScanned++;

    await sleep(1500); // 页面间短暂间隔
  }

  // ── 第三步：去重 ──────────────────────────────────
  const uniqueBooks = deduplicate(allBooks);
  console.log(`\n总计抓取: ${allBooks.length} 条，去重后: ${uniqueBooks.length} 条`);

  // ── 第四步：输出文件 ──────────────────────────────
  const jsonPath = join(OUTPUT_DIR, "books_raw_from_zlibrary.json");
  writeFileSync(jsonPath, JSON.stringify(uniqueBooks, null, 2), "utf-8");
  console.log(`✓ JSON: ${jsonPath}`);

  const csvHeader =
    "title,author,year,language,extension,sourceUrl,page,source,status";
  const csvRows = uniqueBooks.map((b) =>
    [
      `"${(b.title || "").replace(/"/g, '""')}"`,
      `"${(b.author || "").replace(/"/g, '""')}"`,
      `"${b.year || ""}"`,
      `"${b.language || ""}"`,
      `"${b.extension || ""}"`,
      `"${b.sourceUrl || ""}"`,
      b.page,
      b.source,
      b.status,
    ].join(",")
  );
  writeFileSync(
    join(OUTPUT_DIR, "books_raw_from_zlibrary.csv"),
    "﻿" + [csvHeader, ...csvRows].join("\n"),
    "utf-8"
  );
  console.log(`✓ CSV: ${join(OUTPUT_DIR, "books_raw_from_zlibrary.csv")}`);

  const summary = {
    totalRaw: allBooks.length,
    totalUnique: uniqueBooks.length,
    pagesScanned,
    failedPages,
    exportedAt: now(),
    startUrl: START_URL,
    finalUrl: page.url(),
  };
  writeFileSync(
    join(OUTPUT_DIR, "books_raw_summary.json"),
    JSON.stringify(summary, null, 2),
    "utf-8"
  );
  console.log(`✓ Summary: ${join(OUTPUT_DIR, "books_raw_summary.json")}`);

  console.log("\n[ZLibrary] export completed");
  await context.close();
}

main().catch((err) => {
  console.error("致命错误:", err);
  process.exit(1);
});
