# Project Handoff — 张嘉祥数字档案馆

## 项目概览

Astro 5.x 静态站点，个人数字档案馆。7 个页面，约 2351 行源码（含样式）。

| 页面 | 路由 | 状态 |
|---|---|---|
| 首页 | `/` | 稳定 |
| 关于我 | `/about` | 稳定 |
| 旅程地图 | `/journeys` | 稳定（Leaflet 地图） |
| 我的书架 | `/books` | **详情卡残留问题已修复，下一阶段重点：列表视图重做** |
| 网站收藏 | `/links` | 稳定 |
| 随笔列表 | `/notes` | 稳定 |
| 随笔详情 | `/notes/[slug]` | 稳定 |

## `/books` 页面架构

### 文件清单

| 文件 | 行数 | 职责 |
|---|---|---|
| `src/pages/books.astro` | 815 | 主页面：服务端数据、HTML、全部 JS、全部 CSS |
| `src/components/BookWallCard.astro` | 27 | 书墙卡片组件（纯封面 `<img>`，无文字） |
| `src/components/BookCard.astro` | 44 | **遗留组件，当前页面不使用** |
| `src/styles/global.css` | 1465 | 全局样式，含 `bk-*` 和 `section-label` 共享类 |
| `src/data/books.json` | — | 425 本书数据 |

### 书墙视图 (`<section id="bk-wall-section">`)

```
.books-wall-stage > .books-wall-grid (CSS Grid, 6→5→4→2 列响应式)
  └── .bw-card[data-size] × 40
        └── img.bw-card-img
```

- 40 本，hash 确定性随机抽样（`seededSample(books, 40, 42)`）
- 4 种尺寸：small(1×1), tall(1×2), wide(2×1), large(2×2)
- `grid-auto-flow: dense` 交错填充
- 卡片纯封面，hover 轻微放大（1.04x）+ 阴影
- 邻近放大动效：`MAX_DIST=420, MAX_SCALE=1.28`，仅桌面端，仅 `transform: scale()`

### 视口级浮动详情卡

两个独立 DOM 元素放在 `</BaseLayout>` 之前，使用 `position: fixed`：

```html
<svg class="book-detail-connector-layer" hidden>  <!-- z-index:70, pointer-events:none -->
<aside class="book-viewport-detail-panel" hidden>  <!-- z-index:80, width:330px -->
```

- 默认 `hidden` 属性（`display:none`），不占空间
- hover 卡片 → 显示面板 + 虚线连接
- click 卡片 → 固定（`pinnedId`），面板显示"已固定"+"取消固定"
- 定位逻辑：优先卡片右侧 → 不足放左侧 → 再不足贴右侧。y 轴对齐卡片中心，clamp 在视口内。
- 面板内容：field, title, author, status, year, tags(≤5), note(非空非"待补充"), 豆瓣链接
- 禁止显示：language, extension(EPUB/PDF/MOBI), source, sourceUrl
- `tagBlocklist` 正则过滤标签中的年份、语言名、文件格式

### 面板隐藏逻辑（`bindPanelHide()`）

```javascript
document.addEventListener("mousemove", (e) => {
  if (pinnedId) return;          // 固定时不隐藏
  if (currentView !== "wall") return;  // 列表视图不处理
  if (viewportPanel.hidden) return;   // 已隐藏则跳过
  const t = e.target;
  if (t.closest?.(".bw-card") || viewportPanel.contains(t) || connectorLayer.contains(t)) return;
  hideViewportPanel();
});
```

### 列表视图 (`<section id="bk-list-section">`)

- 紧凑横向卡片：序号 → 56×78px 封面 → 书名/状态 → 作者·分类·年份 → 标签 → 豆瓣按钮
- 每页 15 本（`PAGE_SIZE = 15`），带"上一页/下一页"分页
- 搜索/筛选变化自动回第 1 页
- 列表视图不显示详情面板

### 工具函数

| 函数 | 作用 |
|---|---|
| `fieldToCover(field)` | 分类 → 封面图路径（服务端） |
| `getCover(b)` | 取真实封面或回退分类封面（客户端） |
| `getWallSize(id)` | hash 确定卡片尺寸 |
| `filterTags(tags)` | 过滤年份/语言名/文件格式标签 |
| `hasNote(book)` | 检查 note 是否有效（非空且非"待补充"） |
| `esc(s)` | HTML 转义 |

---

## 本轮（2026-05-04）完成的工作

1. 书墙卡片去文字化：`BookWallCard.astro` 重写为纯封面 `<img>`，移除遮罩层和文字浮层
2. 分类封面图集成：10 张 PNG 对应 10 个 field，无真实封面的书回退到分类封面
3. 详情面板从书墙内部 absolute → 视口级 fixed：不再遮挡书墙，默认 hidden
4. SVG 虚线连接：从卡片边缘到面板边缘，`stroke-dasharray: 5 6`
5. hover/click/固定/取消固定 交互逻辑完整
6. 详情内容清理：不显示 language / extension / EPUB / PDF / MOBI / source / sourceUrl
7. 列表视图重做：紧凑横向卡片 + 每页 15 本分页
8. 底部留白：`.books-wall-stage { margin-bottom: 5rem }` 防止 footer 遮挡
9. 面板隐藏：文档级 mousemove 监听 + closest 检测
10. 详情卡残留不消失问题已修复，并已本地目测验收通过

### 详情卡残留修复记录

- 统一详情卡隐藏入口：隐藏时清理 `pinnedId` 和当前 hover 状态，避免旧状态在下一次 render 后复活
- 隐藏时同时设置 `hidden`，并清空 `viewportPanel.style.cssText`
- 隐藏 SVG connector，避免虚线残留
- 在 `positionViewportPanel()` 中增加视图和 DOM 连接状态检查，列表模式下不显示书墙详情卡
- 使用状态 token 防止旧的 `requestAnimationFrame` 定位回调在隐藏后继续写入位置
- 修复重点是防止 inline `display:block` 覆盖 `[hidden] { display:none }`

---

## 仍然存在的问题

### 1. 列表视图仍然不够紧凑

**现象：** 用户反馈列表视图"仍然太大，不像紧凑书目列表"。

**当前 CSS：** 封面 56×78px，卡片 padding 0.55rem，字号 0.54~0.82rem。

**可能原因：**
- 每张卡片仍然较高（封面 78px + padding 约 22px = 约 100px/张），15 张约 1500px
- `align-items: center` 让短内容卡片也有相同高度
- 字号相对封面大小偏大
- 可能需要进一步减小封面、减小间距、去掉豆瓣按钮的独立区域

---

## 下一轮最优先的 3 个任务

1. **列表视图重做为紧凑书目列表** — 减小封面尺寸（如 44×62px）、减小 padding、降低字号，目标每张卡片约 65-75px 高度；必要时重新设计为更像书目目录的高密度布局
2. **分页体验优化** — 保留当前分页能力，但进一步检查翻页后的滚动位置、结果提示、空状态等细节
3. **移动端适配与数据清洗** — 优化移动端详情/列表体验，并继续补充封面、豆瓣链接、阅读笔记等书目数据

---

## 构建状态

✅ `npm run build` 通过（7 页，约 3s）

## 运行方式

```bash
npm run dev    # 开发服务器 → http://localhost:4321/books
npm run build  # 生产构建 → dist/
```
