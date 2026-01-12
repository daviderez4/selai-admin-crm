import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SelaiOS - InsuranceAI System",
  description: "פלטפורמת ה-AI המתקדמת לניהול סוכנויות ביטוח. שילוב של סוכנים וירטואליים, אוטומציה ודאטה בזמן אמת.",
  metadataBase: new URL('https://selai.app'),
  icons: {
    icon: "/sela-logo.png",
    shortcut: "/sela-logo.png",
    apple: "/sela-logo-full.png",
  },
  openGraph: {
    title: "SelaiOS - InsuranceAI System",
    description: "פלטפורמת ה-AI המתקדמת לניהול סוכנויות ביטוח",
    url: "https://selai.app",
    siteName: "SelaiOS",
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SelaiOS - InsuranceAI System",
    description: "פלטפורמת ה-AI המתקדמת לניהול סוכנויות ביטוח",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50`}
      >
        {children}
      </body>
    </html>
  );
}
