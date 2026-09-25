import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PWARegister from "@/app/components/PWARegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "حَقَّ تِلَاوَتِهِ | منصة إتقان تلاوة القرآن الكريم",

  description:
    "منصة إتقان تلاوة القرآن الكريم لتعلم أحكام التجويد ومراجعتها والاختبار فيها.",

  applicationName: "حَقَّ تِلَاوَتِهِ",

  keywords: [
    "حَقَّ تِلَاوَتِهِ",
    "منصة إتقان تلاوة القرآن الكريم",
    "تجويد",
    "أحكام التجويد",
    "القرآن الكريم",
    "تعلم التجويد",
  ],

  manifest: "/manifest.webmanifest",

  icons: {
    icon: "/icons/icon-192.png",
    shortcut: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "حَقَّ تِلَاوَتِهِ",
  },

  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#1f6b4f",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}