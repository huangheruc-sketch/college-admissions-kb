# Summer Programs Explorer

<div data-explorer-view="summer-programs">加载 Summer Programs Explorer...</div>

## 数据说明

- **数据来源：** [AnnDave Consulting Portal](https://portal.anndaveconsulting.com/dashboard/database/summer-programs/list) — 2026-04-10 抓取
- **当前收录：** 25 / 330 条（仅 Page 1 已结构化，Pages 2-4 待补抓）
- **数据文件：** `data/explorers/summer-programs.json`

### 可筛选字段

| 字段 | 说明 |
|------|------|
| Grade | 最低年级要求（7th+ ~ 12th+） |
| Format | In-Person / Online / Hybrid |
| Rec Letters | 推荐信数量（0 / 1 / 2） |
| State | 所在州 |
| Updated For | 是否已更新到 2026 |
| Deadline | 截止日期状态（Rolling / 具体日期 / Passed / 未知） |

### 字段来源说明

所有字段均来自 portal 原始表格列：Summer Program、Location、Deadline、# Rec Letters、Grade Req'ts、Updated For。`format` 和 `state` 由 location 字段自动推导。**ADC Tier 字段未纳入首版**（原始数据中此列大多为空）。

### 待补充

- [ ] 补抓 Pages 2-4（剩余 305 条程序）
- [ ] 补充 ADC Tier 数据（如可用）
- [ ] 补充各程序详情页链接（portal 内页）
- [ ] 增加 tags / category 分类（STEM、Arts、Business、Research 等）
