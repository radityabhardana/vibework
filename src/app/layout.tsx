import type { Metadata } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LanguageProvider } from "@/context/LanguageContext";

import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vibework | Project-Based AI Coding",
  description: "Platform Orkestrasi Vibe Coding Sistemis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className={`${plusJakartaSans.variable} ${ibmPlexMono.variable} antialiased h-screen w-screen flex overflow-hidden bg-background text-foreground`}>
        {/* Main Content Area */}
        <div className="flex-1 h-full w-full flex flex-col relative overflow-hidden">
          <ErrorBoundary>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </ErrorBoundary>
        </div>
      </body>
    </html>
  );
}
