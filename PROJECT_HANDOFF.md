# Project Handoff - 张嘉祥数字档案馆

## 当前状态

Astro 5.x 静态站点，个人数字档案馆。当前工作区上一轮功能提交已完成，主要围绕全站纸质档案馆视觉基底和 `/journeys` 旅程地图增强。

## 已完成提交

- `b8054cb checkpoint: stabilize archive site before redesign`
- `a9b564e feat: redesign archive shell and enhance journey map`

## 最新完成内容

提交 `a9b564e feat: redesign archive shell and enhance journey map` 已完成：

- 第一轮全站视觉基底改造；
- Header / Footer 改为更接近纸质档案馆风格；
- 首页总目录化；
- `/journeys` 旅程地图数据补充；
- 旅程地点改为省-市-区县层级目录；
- 城市 marker 与列表联动；
- 点击列表城市可缩放地图并同步高亮；
- 点击地图 marker 可缩放到城市并同步展开、高亮列表；
- marker hover / click 命中区域修复，外层 hit area 扩大，视觉圆点保持克制。

## 当前仍未完成

- `public/data/china-provinces.geojson` 文件已存在，本文档此前关于“缺少文件”的信息已过期；
- 仍需复核省级 GeoJSON 面图层是否在 `/journeys` 按预期启用；
- 仍需验收去过省份 / 未去过省份是否在地图上直接以省份填色区分；
- 当前 `JourneyMap.astro` 已有 GeoJSON 接入和优雅降级逻辑，下一步应集中验收真实边界文件加载后的省份 hover、缩放和目录展开。

## 稳定回滚点

- `b8054cb checkpoint: stabilize archive site before redesign`
- `a9b564e feat: redesign archive shell and enhance journey map`

## 页面概览

| 页面 | 路由 | 状态 |
|---|---|---|
| 首页 | `/` | 已完成总目录化和视觉基底改造 |
| 关于我 | `/about` | 稳定 |
| 旅程地图 | `/journeys` | 城市 marker、层级目录和联动可用；省级面填色待验收 |
| 我的书架 | `/books` | 稳定，未在最新旅程地图任务中修改 |
| 网站收藏 | `/links` | 稳定 |
| 随笔列表 | `/notes` | 稳定 |
| 随笔详情 | `/notes/[slug]` | 稳定 |

## 构建状态

- 最新功能提交前后 `npm run build` 已通过。

## 运行方式

```bash
npm run dev
npm run build
```
