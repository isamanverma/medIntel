import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans } from "next/font/google";
import SessionProvider from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import { cn } from "@/lib/utils";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mymedintel.vercel.app"),
  title: {
    default: "MedIntel — AI-Powered Healthcare Intelligence",
    template: "%s | MedIntel",
  },
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
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/logo.png", sizes: "32x32", type: "image/png" },
      { url: "/logo.png", sizes: "192x192", type: "image/png" },
      { url: "/logo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/logo.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/logo.png"],
  },
  openGraph: {
    type: "website",
    url: "https://mymedintel.vercel.app",
    siteName: "MedIntel",
    title: "MedIntel — AI-Powered Healthcare Intelligence",
    description:
      "Smarter diagnostics, better outcomes. MedIntel combines artificial intelligence with clinical expertise to transform how patients and doctors interact with health data.",
    images: [
      {
        url: "/og.webp",
        width: 1200,
        height: 630,
        alt: "MedIntel platform preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MedIntel — AI-Powered Healthcare Intelligence",
    description:
      "Smarter diagnostics, better outcomes. MedIntel combines artificial intelligence with clinical expertise to transform how patients and doctors interact with health data.",
    images: ["/og.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(dmSans.variable, geistSans.variable, geistMono.variable)}
    >
      <body className="antialiased font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <TooltipProvider>
              <ToastProvider>{children}</ToastProvider>
            </TooltipProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
