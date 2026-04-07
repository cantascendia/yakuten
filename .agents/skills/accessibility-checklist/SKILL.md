---
name: accessibility-checklist
description: >
  无障碍合规检查。当任务涉及 UI 组件、图片、可交互元素、导航结构时触发。
  确保 App 满足 WCAG AA 级基础要求。不适用于纯后端代码。
---

# 无障碍合规检查

在提交涉及 UI 的代码前，逐项检查：

## 语义标签
- [ ] 所有 `Image` / `Icon` 设置了 `semanticLabel`（有意义的描述）
- [ ] 装饰性图片设置 `excludeFromSemantics: true`
- [ ] 自定义 Widget 中的可交互元素包裹在 `Semantics` 中

## 对比度
- [ ] 文字颜色与背景颜色对比度 ≥ 4.5:1（正文）或 ≥ 3:1（大号文字）
- [ ] 可使用在线工具验证：https://webaim.org/resources/contrastchecker/

## 触控目标
- [ ] 所有可点击元素尺寸 ≥ 48x48 dp
- [ ] 相邻可点击元素间距 ≥ 8dp

## 屏幕阅读器
- [ ] 使用 TalkBack（Android）或 VoiceOver（iOS）测试核心流程可操作
- [ ] 阅读顺序与视觉顺序一致
- [ ] 状态变化（加载、错误、成功）有语义通知（`SemanticsService.announce`）

## 动态适配
- [ ] 支持系统字体缩放（测试 1.5x 和 2.0x 不崩不溢出）
- [ ] 尊重系统"减少动态效果"设置（`MediaQuery.disableAnimations`）
