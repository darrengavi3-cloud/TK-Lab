# 观史台设计入口

## Overview

观史台面向中文史料读者与审校者。完整视觉契约在 [atlas/DESIGN.md](atlas/DESIGN.md)，交互规范在 [atlas/UX-CONTRACT.md](atlas/UX-CONTRACT.md)。此文件只提供根目录入口。

## Colors

运行时采用 Model B：`atlas/assets/ui/tokens.css` 的 `--sgz-*` 令牌及既有 `--v56-*` 主题映射为唯一来源；外壳导入同一文件，不新增色值。

## Typography

沿用既有宋体标题和中文正文字体。常用正文16px，引文14px，次级计数12px。不新增远程字体。

## Layout

保留四个主板块与更多案卷。

## Components

表格和分页复用 Element Plus；卷次按钮与正文链接使用原生语义和44px操作范围。加载失败提供重试并保留网址。

## Do's and Don'ts

原文与历史审定记录保持完整。分别记录构建、浏览器和真实设备验收；不以测试成功代替视觉或部署完成。

## 管理後台一期

`admin/` 與 `public/admin.css` 使用同一 `--sgz-*` 令牌及三套主題；不另建配色。後台採繁體中文，Element Plus 控制項同步使用繁體標籤。桌面六項側欄、列表與詳情；760px 以下依次呈現列表和詳情。搜尋、錯誤、保存與恢復遵循 atlas/UX-CONTRACT.md 頂部的新後台契約。
