# TODO

## 最新已完成

- [x] 第一轮全站视觉基底改造；
- [x] Header / Footer 改为更接近纸质档案馆风格；
- [x] 首页总目录化；
- [x] `/journeys` 旅程地图数据补充；
- [x] `/journeys` 支持省-市-区县层级目录；
- [x] 城市 marker 与列表联动；
- [x] 点击列表城市可缩放地图并同步高亮；
- [x] 点击地图 marker 可同步列表展开和高亮；
- [x] marker hover / click 命中区域修复；
- [x] 已提交：`a9b564e feat: redesign archive shell and enhance journey map`。

## 当前未完成

- [x] `public/data/china-provinces.geojson` 文件已存在，本文档此前关于“缺少文件”的信息已过期；
- [ ] 复核省级 GeoJSON 面图层是否按预期启用；
- [ ] 在地图上用省份填色直接区分去过省份 / 未去过省份；
- [ ] 验收省份 hover 显示省名；
- [ ] 验收点击已去过省份后展开对应省份目录并缩放到省级边界。

## 稳定回滚点

- `b8054cb checkpoint: stabilize archive site before redesign`
- `a9b564e feat: redesign archive shell and enhance journey map`

## 后续建议

- `public/data/china-provinces.geojson` 已存在，后续优先验收它与 `/journeys` 省级面图层的实际联动。
- GeoJSON 的 `properties` 里需要能匹配省份名称，例如 `河南省`、`浙江省`、`江苏省`、`青海省`、`甘肃省`、`内蒙古自治区`、`北京市`。
- 在已存在 GeoJSON 基础上，集中验收 `/journeys` 的省份填色、hover tooltip、点击省份缩放和目录展开。
