import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "聚英資訊 派工系統",
  description: "聚英資訊保養維修派工單電子化系統",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
