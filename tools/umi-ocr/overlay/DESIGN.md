---
version: alpha
name: "Sumi-OCR desktop"
description: "离线识别桌面工具，沿用上游标签页和紧凑配置面板。"
colors:
  background: "#FFFFFF"
  text: "#000000"
  secondary: "#555555"
  tab: "#F3F3F3"
  primary: "#C58940"
typography:
  ui:
    fontFamily: "Microsoft YaHei"
  data:
    fontFamily: "Microsoft YaHei"
omitted:
  - section: rounded
    reason: "Existing Qt Quick shared controls own geometry; no geometry change in this iteration."
  - section: spacing
    reason: "Existing Configs and Widgets own spacing; no new layout values."
components:
  config: {backgroundColor: "{colors.background}", textColor: "{colors.text}"}
  notifications: {backgroundColor: "{colors.background}", textColor: "{colors.secondary}"}
  tabs: {backgroundColor: "{colors.tab}", textColor: "{colors.text}"}
  accentText: {textColor: "{colors.primary}"}
---

# Sumi-OCR Desktop Design

## Overview

面向本地图片和扫描文档的使用者；当前迭代以识别准确率为重点，增加独立离线引擎、模型配置和右起分栏排序，并保留任务恢复与校对包导出。名称使用 Sumi-OCR，关于页面注明 Umi-OCR 来源。视觉参照为现有桌面工具的标签页、文件列表、文字结果和右侧配置栏。保留紧凑操作密度，识别文字和处理状态优先。

Runtime source of truth: `UmiOCR-data/qt_res/qml/Themes/Theme.qml` 与共享 Configs/Widgets；本文记录现状，不生成主题。上述颜色映射默认浅色主题的 bgColor/textColor/subTextColor/tabBarColor/specialTextColor；其余主题继续使用运行时定义。没有新增或修改视觉 token。

语言沿用 qsTr 与上游翻译机制。此次新增源文案为中文；其他语言翻译和原生审校未完成。不从已有日语翻译推断日本市场业务要求。

## Colors

background/text 是主要阅读面；secondary 是次要内容；tab 是标签栏；primary 是主题特殊文字。错误与恢复状态必须有文字，不能只依靠颜色。没有对现有主题做完整对比度审计。

## Typography

UI/data 字体继承 Theme 中的 fontFamily/dataFontFamily 及用户全局设置，保留中文、生僻字回退。任务参数与结果文本各走原有字体角色，不为新开关添加字体。

## Layout

图片与文档继续使用原有分栏、文件列表和结果区。继续任务开关置于各自“批量任务”设置组；共用 UtilsConfigDicts 的配置定义和现有布尔控件，不改变外层滚动或窗口布局。校对包开关位于两页“保存文件类型”，共用 getReviewOutput。

## Elevation & Depth

弹窗、提示与设置背景使用现有共享组件；不增加卡片、阴影或浮层。

## Shapes

控件形状来自现有 Widgets 与 Qt Controls。此次无独立圆角或尺寸值。

## Components

同名操作在两页面共用标题和说明。恢复结果在已有状态列显示“已恢复”。不完整页保留文字，并在标题标出“识别不完整”；批次结束展示警告。继续任务与校对包默认关闭，用户可明确开启。校对提示说明仅本地保存，模型建议需显式采纳；未知置信度使用文字标识。

配置控件和通知分别由 Configs 与 Popup_ 负责。排版下拉框继续使用 Configs.qml 的 compEnum 与 QtQuick.Controls.ComboBox；弹出层的主题、布局和键盘行为由现有控件负责。新增配置复用字符串和布尔项；没有新交互动画。Qt桌面键盘、主题、提示布局仍待实际验证，不能据配置代码声称可访问性通过。

## Do's and Don'ts

- Do: 使用源文档词汇，保留现有按钮和快捷入口。
- Do: 区分恢复、识别失败、部分成功与人工校对。
- Don't: 为一个设置项改造整个界面，或引入网页导航。
- Don't: 用成功图标掩盖漏页、写出失败或未完成的模型验收。
