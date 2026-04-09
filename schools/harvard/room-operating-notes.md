---
school: harvard
page_type: operating_notes
status: draft
updated_at: 2026-04-09
language: zh-CN
---

# Harvard Room Operating Notes

这是一页给未来维护者看的最小运行说明，只回答一个问题：**明天如果又来一批 Harvard 素材，应该怎么进系统。**

## 最小进入路径
1. **先放 raw**
   - 官方页面：`raw/official/harvard/`
   - 公开分析：`raw/analysis/harvard/`
   - 公开咨询/第三方案例：`raw/consulting/harvard/`

2. **更新 source registry**
   - 在 `processed/sources/registry.yaml` 中登记或更新对应 source
   - 同 `school + cycle + module + url` 视为同一 source 的新版本，不新开 source_id

3. **更新对应 processed 层**
   - Fact Sheet → `processed/schools/harvard/fact-sheet-fields.yaml`
   - Admission Data → `processed/schools/harvard/admission-data-summary.yaml`
   - Case Study → `processed/cases/harvard-case-studies.yaml`
   - Sources 页主要读取 registry

4. **重渲染 generated 页**
   - 让 `*.generated.md` 先接住新增结果
   - 正式页继续作为稳定入口，不直接把 generated 页顶到导航主路径

5. **回到正式页检查承接是否清楚**
   - Hub 是否仍能作为门厅
   - 房间是否仍清楚写明：放什么 / 不放什么 / 当前状态 / 后续怎么增长

## 房间分发规则
- 明确事实 → Fact Sheet
- 来源与版本 → Sources
- 年份数字与摘要 → Admission Data
- 个案样本 → Case Study
- 证据沉淀后的建议 → Application Strategy

## 当前阶段的边界
- 先保结构统一，不追求内容填满
- 先保链路稳定，不做大规模重构
- 新材料先进入系统，再决定是否进入正式定稿内容
