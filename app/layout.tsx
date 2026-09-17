import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "まいにち献立",
  description: "レシピをためて、今日の晩ごはんを決めよう。",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "まいにち献立", statusBarStyle: "default" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
