---
name: handbook-search
description: >
  ai-playbook handbook (3986 行) 智能查询入口。当用户/任务提到 §NN.M 章节号、
  "手册"、"playbook"、"铁律 #N"、"反模式"、"竞品" 等关键词时自动触发。
  读 INDEX.md 决定该读哪段 handbook，避免每次塞 3986 行全文进上下文。
user-invocable: false
when_to_use: >
  用户提到 §<数字>.<数字> 章节引用、"手册第 N 节"、"playbook 说"、"铁律 #N"、
  "反模式 #N"、"按手册"、handbook.md 的具体章节查询时。
---

# Handbook Search (§4 Context Engineering 实践)

handbook.md 有 3986 行 / 49 章节。把它全部塞进上下文是反 §4.1 的（attention budget 浪费）。
本 skill 提供"先读 INDEX，再读对应章节"的两段式查询。

## 工作流

### Step 1: 读 INDEX.md

```bash
test -f playbook/INDEX.md && cat playbook/INDEX.md
```

INDEX.md 维护"章节 → 关键词 → 行号范围"映射。例：
```
§32.1 Forbidden 路径 | auth/payment/secrets/migration | L2400-2480
§35   Eval-Driven Dev | golden trajectory / CI gate / mutation | L2680-2780
§44   Deterministic Replay | trajectory jsonl / cost / replay | L3470-3570
```

### Step 2: 按用户问题定位章节

| 用户问题模式 | 应查 |
|---|---|
| "§32.1 怎么说的" | 直接读 L<起>-<止> |
| "铁律 #13 是什么" | grep "铁律 #13" 后定位章节 |
| "vibe coding 反模式" | 搜 §32.5 / §33 |
| "什么是 spec-driven" | §18 |
| "Constitution 怎么写" | §37 / docs/ai-cto/CONSTITUTION.md |
| "怎么跨模型 review" | §48 |
| "怎么写 eval" | §35 / evals/golden-trajectories/ |

### Step 3: 读特定章节段

用 Read 工具的 `offset` + `limit`：
```
Read(file_path="playbook/handbook.md", offset=2400, limit=80)
```

### Step 4: 引用回应

用 §N.M 格式精准引用：
> "按手册 §32.1（L2400-2480），forbidden 路径定义为 ..."

## 反模式

| 反模式 | 应当 |
|---|---|
| 直接 `Read playbook/handbook.md`（全文）| 先读 INDEX 定位 |
| Grep handbook 抓上下文 | INDEX 已索引，grep 是 fallback |
| 凭记忆引用 §N.M | 必须 Read 实际行号确认（铁律 #2） |
| 不引用直接说"手册说" | 必须用 §N.M 格式让用户能查证 |

## 当 INDEX.md 不存在

```
"⚠️ playbook/INDEX.md 不存在（v3.8 应有）。
fallback: 用 grep 找章节。
建议：跑 cto-audit 或手动维护 INDEX.md。"
```

## 引用

- handbook §4.1 Context Engineering（为什么不能塞全文）
- `playbook/INDEX.md`（章节索引 SSOT）
- `playbook/handbook.md`（3986 行原文）
