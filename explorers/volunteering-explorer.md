# Volunteering Explorer

<div data-explorer-view="volunteering">加载 Volunteering Explorer...</div>

## 数据说明

- **数据来源：** [AnnDave Consulting Portal](https://portal.anndaveconsulting.com/dashboard/database/volunteering/list) — 2026-04-10 抓取
- **当前收录：** 270 / 271 条（来自本地 Excel 导出，已可直接筛选）
- **数据文件：** `data/explorers/volunteering.json`

### 可筛选字段

| 字段 | 说明 |
|------|------|
| Category | 志愿活动类别（Health & Medicine、STEM、Tutoring、Coding、Mental Health 等 16 类） |
| Virtual | portal 原始值 yes / no / possibly |
| Location | 地点，可直接筛选城市 / Nationwide / Virtual |
| Grade | 最低年级要求（大部分未注明，少量为 9th+ ~ 11th+） |
| Search | 按机构名、地点、类别关键字搜索 |

### 类别分布概览（本地 Excel 结构化 270 条）

| Category | ~Count |
|----------|--------|
| Health & Medicine | 40 |
| STEM | 40 |
| Families in Need | 33 |
| Tutoring and Education | 21 |
| Arts and Music | 19 |
| Environment | 16 |
| Animals | 16 |
| General Service | 15 |
| Mental Health & Psychology | 14 |
| Culture & History | 13 |
| Senior Citizens | 13 |
| People with Disabilities | 10 |
| Sports and Recreation | 9 |
| Coding | 5 |
| Business | 3 |
| LGBT | 3 |

### 字段来源说明

所有字段均来自本地 Excel 原始表格列：Organization、Location、Virtual Option、Type、Grade Req'ts、Website。当前 JSON 已包含 270 条完整结构化记录；其中 grade 字段大多为空，属于源表本身未填写，并非解析遗漏。

### 待补充

- [ ] 核对为何 portal 口径写 271，但当前 Excel 仅有 270 条数据行
- [ ] 如后续 portal 提供更多字段，可补 time commitment / deadline / description / tags
- [ ] 若需要更强检索，可后续增加多关键词高亮与组合筛选
