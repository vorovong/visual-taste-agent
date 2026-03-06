import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Visual Taste Agent",
  description: "시각적 취향 발견 및 체계화 시스템",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Inline script to prevent flash of wrong theme on page load.
  // Runs synchronously before the body is painted.
  const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('theme') || 'dark';
    var d = t === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : t;
    if (d === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch(e){}
})();
`.trim();

  return (
    <html lang="ko" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${inter.variable} ${mono.variable} ${inter.className} bg-[hsl(var(--background))] text-[hsl(var(--foreground))] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
