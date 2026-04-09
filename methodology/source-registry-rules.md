---
page_type: methodology
rule_type: source_registry_rules
language: zh-CN
status: draft
updated_at: 2026-04-09
---

# Source Registry Rules

## 这页负责什么
本页用最小规则说明 source、module、raw version 三者如何协作，避免后续接学校时越做越乱。

## 1. 什么算同一个 source
当前 registry 里，一个 source 以这 4 个字段共同确定：
- `school`
- `cycle`
- `module`
- `url`

也就是说：
- 同 school + cycle + module + url，再次抓取，视为**同一 source 的新版本**
- 如果 `module` 不同，即使 URL 相同，也视为**不同房间中的不同使用记录**

## 2. module 应该怎么命名
当前采用两段式命名：
- 第一段 = 页面/房间（如 `fact_sheet`、`admission_data`、`case_study`）
- 第二段 = 在该房间里的用途（如 `timeline`、`requirements`、`statistics`）

例子：
- `fact_sheet.timeline`
- `fact_sheet.requirements`
- `admission_data.statistics`
- `case_study.public_media`

最小约束：
- 不把“来源性质”直接塞进第一段
- 第二段优先表达“用途”，不是随意备注
- 同一 URL 若被多个房间复用，可以有多个 module，但要各自说明用途

## 3. raw 版本策略
registry 不为每次抓取新建一条 source，而是在同一条 source 下维护版本：
- `status: active` = 该 source 仍在用
- `is_latest: true` = 当前页面应优先使用这一条记录中的最新版本
- `current_version` = 当前有效版本号
- `fetch_history[]` = 历次抓取记录
- `superseded_html_paths[]` = 已被后续抓取替代的 raw 文件

## 4. 页面应该优先用哪个版本
页面渲染默认只读：
- `status=active`
- `is_latest=true`

并优先使用：
- `latest_html_path`
- 或 `fetch_history` 中最新一条 `status=latest` 的 raw

这意味着：
- 历史 raw 仍保留，方便追溯
- 但 Harvard 当前页面默认都指向当前有效版本，不再随机落到旧抓取

## 5. 为什么本轮先不做更大重构
当前 registry 同时承担“来源对象”与“模块使用”两层职责，这并不完美；但在当前阶段，先把唯一键、命名规则、版本语义讲清楚，已经足够支撑继续扩学校。

后续如学校数量上来，再考虑拆成：
- canonical source object
- module usage mapping
