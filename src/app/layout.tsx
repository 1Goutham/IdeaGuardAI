import type { Metadata, Viewport } from "next";
import { Anonymous_Pro, Outfit } from "next/font/google";
import { Providers } from "@/components/Providers";
import { themeScript } from "@/components/ui";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-outfit", display: "swap" });
const mono = Anonymous_Pro({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono-ap", display: "swap" });

export const metadata: Metadata = {
  title: { default: "IdeaGuard — Turn an idea into evidence", template: "%s · IdeaGuard" },
  description: "An AI product intelligence workspace that researches, stress-tests and turns early-stage ideas into evidence-backed product strategy.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f1ed" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0e" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-[13px] focus:text-on-ink">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
