# 用 Antigravity CLI 调 Gemini 做跨模型 review（操作手册）

> 给任何会话复用。Antigravity 没有官方 headless CLI，本手册是实测摸出来的调用链
> （yakuten 会话 2026-07-23 打通，用于 PR 跨模型 review 的 gemini 第二签）。
> 平台：Windows。gemini 免费额度即可，无需 API key。

## 一句话原理

Antigravity IDE 内嵌一个 `language_server.exe`，它带一个 gRPC 的 **agent API**。
命令行入口是 `~/.gemini/antigravity/bin/agentapi.bat`。你只要：**确保 IDE 在跑 →
发现三个连接参数 → 用环境变量喂给 agentapi → new-conversation**，对话就自动绑定
到对应工作区，gemini agent 能自己跑 git/读写文件。

## 步骤（照抄，用 PowerShell 工具）

### 1. 确保 Antigravity IDE 在运行
```powershell
if (-not (Get-Process language_server -ErrorAction SilentlyContinue)) {
  Start-Process "$env:LOCALAPPDATA\Programs\Antigravity\Antigravity.exe"; Start-Sleep -Seconds 20
}
```
⚠ **不要**自己 headless 直启 language_server —— 它会死在 `Failed to read initial
metadata from stdin` 握手上。必须让 IDE 拉起它。

### 2. 发现三个连接参数
```powershell
$p = (Get-Process language_server)[0].Id
$cl = (Get-CimInstance Win32_Process -Filter "ProcessId=$p").CommandLine
$token = if ($cl -match '--csrf_token (\S+)') { $Matches[1] } else { '?' }
$ports = (Get-NetTCPConnection -OwningProcess $p -State Listen | Select -Expand LocalPort | Sort) -join ','
"PORTS=$ports  TOKEN=$token"
```
- **CSRF token**：命令行里的 `--csrf_token`（每次 IDE 启动都变）。
- **端口**：language_server 监听两个端口。gRPC 那个才对 —— 通常是**较大/第二个**，
  但最稳的判定是「哪个端口能通过 CSRF 认证」（见步骤 4，认证不再报错的即为对的）。
- **project_id**：从 `~/.gemini/config/projects/*.json` 按 `name` 字段找目标工作区：
```powershell
Get-ChildItem "$env:USERPROFILE\.gemini\config\projects\*.json" | ForEach-Object {
  $j = Get-Content $_ -Raw | ConvertFrom-Json; "$($j.name)`t$($j.id)"
}
```
（yakuten 的 id 是 `b1f06cab-729d-4ad8-a6f4-686a71e1a08e`，仅作示例；每个工作区不同。）

### 3. 发起对话（Bash 工具，三个环境变量）
```bash
export ANTIGRAVITY_LS_ADDRESS=localhost:<对的端口> \
       ANTIGRAVITY_CSRF_TOKEN=<token> \
       ANTIGRAVITY_PROJECT_ID=<project_id>
~/.gemini/antigravity/bin/agentapi.bat new-conversation --model=flash "<短指令>"
```
- `--model`：`flash` / `pro` / `flash_lite`。review 用 `flash`（就是 gemini 3.x flash）。
- 返回 `{ "response": { "newConversation": { "conversationId": "..." } } }`。
- **子命令**：`new-conversation` / `send-message <id> <content>` / `get-conversation-metadata <id>`。

### 4. 认证/端口自检
若报 `missing CSRF token` → token 环境变量名写错（必须是 `ANTIGRAVITY_CSRF_TOKEN`）。
若报 `error reading server preface: EOF` → 端口选错了，换另一个端口。
若报 `project_id is required` → 少了 `ANTIGRAVITY_PROJECT_ID`。
认证通过后会看到 `project_id is required` 之外的正常响应或 conversationId。

## 大材料 / 长报告的正道（关键）

agentapi 的 prompt 是命令行参数，**长 diff 直接塞会超 Windows 命令行长度上限**。所以：
1. 把 review 请求（含红线清单、输出格式要求）**写进工作区一个文件**，如
   `.tmp-review/gemini-review-request.md`。
2. 指令只说一句：「读取 `.tmp-review/gemini-review-request.md`，执行其中的 review
   任务，把报告写入 `.tmp-review/gemini-verdict.md`」。
3. agent 自己会 `git diff` / 读源码 / 写文件。你**轮询** verdict 文件出现
   `VERDICT:` 即完成。

## 已知陷阱

- **agent 自报的模型名不可靠**（可能说自己是别的模型）—— 当作「antigravity flash 档」，
  别把它写进裁决当事实。
- 端口/token 每次 IDE 重启都变，别缓存跨会话。
- `.tmp-review/` 别提交进仓库（加进 `.git/info/exclude`）。
- 交互式认证的 IDE 在无头/cron 环境可能不可用；本手册只适用于有人登录的桌面会话。

## 典型用途：PR 跨模型 review 第二签

配合 codex（gpt-5.x）做双模型把关 —— codex 一路、gemini 一路，两边独立审同一
PR，都 `VERDICT: MERGE` 才合并。gemini 的多语能力适合抽查 i18n 翻译质量。
两份裁决存档 `docs/ai-cto/REVIEW-QUEUE.md`。
