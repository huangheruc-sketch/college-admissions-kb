# Summer Programs Explorer

<div data-explorer-view="summer-programs">加载 Summer Programs Explorer...</div>

## 数据说明

- **数据来源：** [AnnDave Consulting Portal](https://portal.anndaveconsulting.com/dashboard/database/summer-programs/list) + 各项目详情页 `.../summer-programs/profile/:id`，2026-04-11 基于已登录 portal 会话补抓并结构化
- **当前收录：** 330 / 330 条
- **ADC Tier 覆盖：** 297 / 330 条非空，33 条为空或详情页缺失该值，按 `null` 保留
- **ADC Tier 校验说明：** 2026-04-11 已重新登录 portal 与列表页截图复核，当前星级按黑色星星计分（白色为空星）；本批数据现状最高 4 星，最低 1 星，空白控件保留为 `null`
- **数据文件：** `data/explorers/summer-programs.json`

### 可筛选字段

| 字段 | 说明 |
|------|------|
| Grade | 最低年级要求（7th+ ~ 12th+） |
| Format | In-Person / Online / Hybrid |
| Rec Letters | 推荐信数量（0 / 1 / 2 / 3） |
| State | 所在州 |
| Updated For | 是否已更新到 2025 / 2026 |
| Deadline | 截止日期状态（Rolling / 具体日期 / Passed / 未知） |
| ADC Tier | portal 详情页中的 ADC 星级（5 星制，黑色星星为已评分；当前本批数据实测最高 4 星，若空则保留空值） |

### 字段来源说明

列表页提供 Summer Program、Location、Deadline、# Rec Letters、Grade Req'ts、Updated For，以及每条记录对应的详情页链接。`format` 和 `state` 由 `location` 自动推导。`ADC Tier` 本轮从各 program 的 portal 详情页读取星级，并已于 2026-04-11 基于 portal 列表页与截图再次复核，确认黑色星星为已评分、白色星星为空星。该字段为 5 星制，但当前这批 summer programs 数据实测未出现 5 星；若详情页该字段为空、0 星或缺失，则如实保留为 `null`。

### 下一步可补充

- [x] 补充各程序详情页链接（portal 内页）
- [x] 核对并补入详情页 ADC Tier，空值保留为空
- [ ] 增加 tags / category 分类（STEM、Arts、Business、Research 等）
