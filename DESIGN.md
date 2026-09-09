# 观史台设计入口

## Overview

观史台面向中文史料读者与审校者。完整视觉契约在 [atlas/DESIGN.md](atlas/DESIGN.md)，交互规范在 [atlas/UX-CONTRACT.md](atlas/UX-CONTRACT.md)。此文件只提供根目录入口。

## Colors

运行时采用 Model B：`atlas/assets/ui/tokens.css` 的 `--sgz-*` 令牌及既有 `--v56-*` 主题映射为唯一来源；外壳导入同一文件，不新增色值。

## Typography

沿用既有宋体标题和中文正文字体。常用正文16px，引文14px，次级计数12px。不新增远程字体。

## Layout

保留四个主板块与更多案卷。史源表桌面双栏、窄屏依次阅读，卷次每页十二条。

## Components

表格和分页复用 Element Plus；卷次按钮与正文链接使用原生语义和44px操作范围。加载失败提供重试并保留网址。

## Do's and Don'ts

原文与历史审定记录保持完整。分别记录构建、浏览器和真实设备验收；不以测试成功代替视觉或部署完成。
