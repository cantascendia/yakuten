---
name: design-system-enforcement
description: >
  确保 UI 代码遵循项目设计系统。当任务涉及 UI 组件、样式、颜色、字体、
  间距时触发。检查是否引用 theme 而非硬编码值。不适用于后端或测试代码。
---

# 设计系统合规检查

在提交涉及 UI 样式的代码前，逐项检查：

## 颜色
- [ ] 所有颜色值引用 `Theme.of(context).colorScheme.xxx` 或项目定义的颜色常量
- [ ] 不存在直接写 `Color(0xFF...)` 或 `Colors.xxx` 的地方（`Colors.transparent` 除外）
- [ ] 深色模式已适配（如项目支持）

## 字体
- [ ] 所有文字样式引用 `Theme.of(context).textTheme.xxx` 或项目定义的 TextStyle 常量
- [ ] 不存在直接写 `fontSize: 14` 或 `fontWeight: FontWeight.bold` 的地方
- [ ] 字体支持系统级缩放（未使用 `textScaleFactor: 1.0` 强制固定）

## 间距
- [ ] 内外边距使用项目定义的间距常量（如 `AppSpacing.sm`、`AppSpacing.md`）
- [ ] 不存在直接写 `padding: EdgeInsets.all(16)` 等魔法数字的地方
- [ ] 间距遵循统一的倍数体系（4px 或 8px）

## 圆角与阴影
- [ ] 圆角值引用项目常量
- [ ] 阴影 / elevation 值引用项目常量

## 组件
- [ ] 按钮使用项目封装的标准按钮组件，而非直接 `ElevatedButton`
- [ ] 输入框使用项目封装的标准输入组件
- [ ] 如果没有封装组件，至少样式引用 theme

## 参考文档
- 查看项目的 `DESIGN.md` 或 `.stitch/DESIGN.md` 获取完整设计规范
- 如果项目没有 DESIGN.md，提醒 CTO 创建
