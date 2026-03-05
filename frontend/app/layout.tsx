import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SessionProvider from "@/components/providers/SessionProvider";
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
  title: "MedIntel — AI-Powered Healthcare Intelligence",
  description:
    "Smarter diagnostics, better outcomes. MedIntel combines artificial intelligence with clinical expertise to transform how patients and doctors interact with health data.",
  keywords: [
    "healthcare",
    "AI diagnostics",
    "medical intelligence",
    "patient portal",
    "doctor portal",
    "health records",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
