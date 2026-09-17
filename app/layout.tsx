import type { Metadata } from "next";
import { Zen_Kaku_Gothic_New, Shippori_Mincho } from "next/font/google";
import "./globals.css";

const sans = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

const display = Shippori_Mincho({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
  display: "swap",
});

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
    <html lang="ja" className={`${sans.variable} ${display.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
