# Professors Explorer

<div data-explorer-view="professors">加载 Professors Explorer...</div>

## 数据说明

- **数据来源：** `data/research/harvard_faculty_math_appliedmath.json` + [Harvard Professors](../schools/harvard/professors.md)
- **当前收录：** Harvard Mathematics + Applied Mathematics 共 38 位教授
- **数据文件：** `data/explorers/professors.json`
- **当前定位：** 第一版全站 explorer，先以 Harvard 为种子数据；结构里已保留 `school` / `school_slug` 字段，后续可继续并入更多学校

### 可筛选字段

| 字段 | 说明 |
|------|------|
| School | 当前首版只有 Harvard，但字段已按多校扩展预留 |
| Department | Mathematics / Applied Mathematics |
| Status | Active / Emeritus / On Leave / In Residence |
| Research Listed | 是否已有可展示的 primary research areas |
| Search | 按姓名、title、研究方向、学校、院系关键字搜索 |

### 字段来源说明

- `department`、`name`、`title`、`faculty_source_url` 直接来自当前 Harvard faculty roster 抽取结果
- `status` 为轻量派生字段，用于首版筛选：若 title 含 `Emeritus`、`On Leave`、`In Residence` 则按该状态归类，否则归为 `Active`
- `research_areas` 仅在原始数据里已有明确内容时展示；缺失字段保留为空，不做猜测补写

### 后续可扩展

- [ ] 接入 Stanford / MIT / Princeton 等学校 professors 数据
- [ ] 补充 education / work background 的结构化字段与筛选项
- [ ] 如后续每位教授有独立站内详情页，可把 `School page` 回链升级为站内 profile 页面
