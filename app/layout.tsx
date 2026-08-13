import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "中华三国志·职官谱",
  description: "汉末至西晋职官、州镇、战事、食货与历史形势图资料库。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
