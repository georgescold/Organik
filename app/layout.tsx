import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { Toaster } from "@/components/ui/sonner";
import { HomeButton } from "@/components/ui/home-button";
import { TwemojiProvider } from "@/components/twemoji-provider";

export const metadata: Metadata = {
  title: "Organik | TikTok Content Manager",
  description: "Créez, gérez et optimisez votre contenu TikTok.",
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Google Fonts preconnect — editor fonts loaded on-demand via useEditorFonts hook */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen pb-20 sm:pb-24`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          themes={["dark", "white", "beige"]}
          disableTransitionOnChange
        >
          {children}
          <HomeButton />
          <Toaster />
          <TwemojiProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}

