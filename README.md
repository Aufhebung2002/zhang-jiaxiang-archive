# 张嘉祥的数字档案馆

一个本地优先、未来可公开的个人数字档案馆。记录阅读、旅程、收藏、工具探索、法学学习和个人思考，由记忆、审美、工具和 AI 共同搭建的长期个人档案。

## 技术栈

- **框架**：[Astro](https://astro.build) 5.x
- **内容**：Markdown / MDX（随笔文章）
- **数据**：JSON（个人信息、旅程、书籍、链接）
- **地图**：[Leaflet](https://leafletjs.com) + [OpenStreetMap](https://www.openstreetmap.org)
- **样式**：纯 CSS（自定义属性 + 响应式）
- **构建**：静态站点生成，输出纯 HTML/CSS/JS

## 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 浏览器打开 http://localhost:4321

# 4. 构建生产版本
npm run build

# 5. 预览构建结果
npm run preview
```

## 项目结构

```
zhang-jiaxiang-archive/
├── public/
│   ├── favicon.svg
│   └── images/
│       ├── profile/
│       ├── journeys/
│       ├── books/
│       └── notes/
├── src/
│   ├── components/        # 可复用组件
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── BookCard.astro
│   │   ├── LinkCard.astro
│   │   ├── JourneyCard.astro
│   │   └── JourneyMap.astro
│   ├── layouts/           # 页面布局
│   │   ├── BaseLayout.astro
│   │   └── NoteLayout.astro
│   ├── pages/             # 路由页面
│   │   ├── index.astro          # 首页
│   │   ├── about.astro          # 关于我
│   │   ├── journeys.astro       # 旅程地图
│   │   ├── books.astro          # 我的书架
│   │   ├── links.astro          # 网站收藏
│   │   └── notes/
│   │       ├── index.astro      # 随笔列表
│   │       └── [slug].astro     # 随笔详情
│   ├── content/
│   │   └── notes/               # 随笔 Markdown 文件
│   │       └── start.md
│   ├── data/              # JSON 数据文件
│   │   ├── profile.json
│   │   ├── journeys.json
│   │   ├── books.json
│   │   └── links.json
│   ├── styles/
│   │   └── global.css
│   └── content.config.ts
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── README.md
```

## 内容维护

所有内容通过 JSON 或 Markdown 文件管理，无需后台。

| 操作 | 文件 |
|------|------|
| 修改个人信息、关键词 | `src/data/profile.json` |
| 添加/修改旅程地点 | `src/data/journeys.json` |
| 添加/修改书籍记录 | `src/data/books.json` |
| 添加/修改网站收藏 | `src/data/links.json` |
| 写新随笔 | 在 `src/content/notes/` 下新建 `.md` 文件 |

### 随笔文件格式

```markdown
---
title: "文章标题"
date: 2026-05-04
category: "随笔"
tags: ["标签1", "标签2"]
public: true
description: "文章摘要"
---

正文内容。
```

## 本地同步书目

使用 Playwright 从 Z-Library 个人书库导出书目元数据。

```bash
# 1. 运行同步脚本（会自动打开浏览器窗口）
npm run sync:books:zlibrary

# 2. 在打开的浏览器中手动登录 Z-Library

# 3. 确认能看到书籍列表后，回到终端按 Enter

# 4. 脚本自动逐页扫描，输出到 output/ 目录：
#    - output/books_raw_from_zlibrary.json
#    - output/books_raw_from_zlibrary.csv
#    - output/books_raw_summary.json

# 5. 把导出的 JSON/CSV 交给 ChatGPT 清洗分类

# 6. 人工确认后再导入 src/data/books.json
```

**注意**：
- 只提取书目元数据，不下载任何电子书。
- 不保存账号密码或 Cookie 到输出文件。
- 如果抓取失败，可检查 `output/zlibrary-page-*-debug.html` 排查页面结构变化。

## 隐私提醒

本网站按公开标准设计。

**不应放入本仓库的内容**：
- 工作内部信息、具体案件细节
- 他人隐私信息
- 精确住址、手机号、身份证号
- 敏感证件扫描件
- 未经处理的私人照片

## 后续计划

- [ ] 批量导入豆瓣书籍数据
- [ ] Edge 收藏夹 HTML 批量导入转换为 links.json
- [ ] 完善筛选和搜索功能
- [ ] 补充旅程故事和照片
- [ ] 接入更多外部链接（豆瓣、GitHub 等）
- [ ] 部署上线

## 许可

个人项目，暂不设定开源许可。
