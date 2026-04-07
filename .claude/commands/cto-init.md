# 一键初始化目标项目 CTO 系统

你是 AI Playbook 的安装助手。用户要在目标项目中启用完整的 CTO + Tech Lead 指挥系统。

## 参数

`$ARGUMENTS` = 目标项目路径（必须提供）

如果 `$ARGUMENTS` 为空，询问用户提供目标项目的绝对路径。

## 执行步骤

### 1. 验证环境

- 确认 ai-playbook 仓库路径（当前仓库根目录）
- 确认目标项目路径存在且是有效目录
- 检查目标项目是否已有 CLAUDE.md（如有，提示是否覆盖）

### 2. 检测 ai-playbook 路径

自动检测当前 ai-playbook 仓库的绝对路径，用于写入 CLAUDE.md 的手册引用。

### 3. 复制并配置文件

按以下顺序执行：

#### 3a. CLAUDE.md（核心 — 必须）
- 复制 `templates/CLAUDE.md` → 目标项目根目录 `CLAUDE.md`
- **自动替换** `[AI-PLAYBOOK-PATH]` 为实际的 ai-playbook 绝对路径
- 结果：手册引用变为 `C:\projects\ai-playbook\playbook\handbook.md`（实际路径）

#### 3b. .claude/commands/（斜杠命令 — 全部复制）
- 创建目标项目 `.claude/commands/` 目录
- 复制所有 `.claude/commands/*.md`（除了 `cto-init.md` 本身）
- 包括：cto-start, cto-resume, cto-refresh, cto-review, cto-spec, cto-design, cto-skills, cto-audit, cto-models, cto-release

#### 3c. .claude/settings.json（Claude Code 配置）
- 如果目标项目没有 `.claude/settings.json`，复制过去
- 如果已有，提示用户是否合并

#### 3d. .agents/skills/（跨平台 Skill — 全部复制）
- 创建目标项目 `.agents/skills/` 目录
- 复制所有 skill 子目录（含 SKILL.md）
- 包括：ux-quality-checklist, i18n-enforcement, design-system-enforcement, accessibility-checklist, release-readiness

### 4. 检测项目技术栈

扫描目标项目根目录，自动检测：
- `package.json` → Node.js/前端项目
- `composer.json` → PHP 项目
- `pubspec.yaml` → Flutter/Dart 项目
- `requirements.txt` / `pyproject.toml` → Python 项目
- `go.mod` → Go 项目
- `Cargo.toml` → Rust 项目
- `pom.xml` / `build.gradle` → Java 项目

根据检测结果，预填 CLAUDE.md 的 `技术栈` 和 `构建和测试` 区域。

### 5. 输出安装报告

```
## ✅ CTO 系统已安装到 [目标项目路径]

### 已复制文件
- [x] CLAUDE.md（手册路径: ...）
- [x] .claude/commands/ （10 个斜杠命令）
- [x] .claude/settings.json
- [x] .agents/skills/ （5 个 Skill）

### 检测到的技术栈
- [自动检测结果]

### 下一步
1. 检查 CLAUDE.md 中的 `项目特定规则` 是否需要补充
2. 在目标项目中打开 Claude Code
3. 运行 `/cto-start` 开始第零轮
```

### 6. 询问是否立即启动

询问用户是否要切换到目标项目并运行 `/cto-start`。

## 注意事项

- 不修改 ai-playbook 仓库本身的任何文件
- 不复制 `cto-init.md` 到目标项目（初始化命令只在 ai-playbook 中使用）
- 如果目标项目不是 git 仓库，建议用户先 `git init`
- 所有路径使用当前操作系统的格式（Windows 用 `\`，Unix 用 `/`）
