---
name: i18n-enforcement
description: >
  在提交代码前检查国际化合规性。当任务涉及 UI 文本、提示信息、按钮标签、
  错误消息等用户可见字符串时触发。不适用于日志、注释、变量名。
---

# 国际化合规检查

在提交任何涉及用户可见文本的代码前，逐项检查：

## 必须通过

- [ ] 所有用户可见字符串通过国际化函数调用（Flutter: `AppLocalizations.of(context)!.xxx`、`S.of(context).xxx`、或 `context.l10n.xxx`）
- [ ] 新增的字符串已在 `.arb` 文件（或对应的 i18n 资源文件）中定义
- [ ] 字符串 key 使用语义化命名（如 `loginButtonTitle`），不使用数字编号（如 `str_001`）
- [ ] 含变量的字符串使用占位符（如 `{count} items`），不使用字符串拼接
- [ ] 日期、时间、数字、货币使用 `intl` 的格式化方法（`DateFormat`、`NumberFormat`），不手写格式

## 常见违规模式（搜索这些关键词排查）

- 直接写中文/英文字符串在 Widget 的 `Text()` 中
- `'确定'`、`'取消'`、`'提交'`、`'加载中'` 等常见 UI 文本硬编码
- `String` 类型的 const 定义在非 i18n 文件中用于 UI 显示
- `SnackBar`、`AlertDialog`、`Tooltip` 中的硬编码文本

## 例外

以下场景允许不走 i18n：
- 日志输出（`log()`、`print()`、`debugPrint()`）
- 代码注释
- 开发者面向的调试信息
- 第三方 SDK 要求的固定字符串参数
