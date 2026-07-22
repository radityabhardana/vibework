import type { Metadata } from "next";
import { Archivo_Black, IBM_Plex_Mono } from "next/font/google";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import "./globals.css";

const archivoBlack = Archivo_Black({
  weight: "400",
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

import { LanguageProvider } from "@/context/LanguageContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${archivoBlack.variable} ${ibmPlexMono.variable} antialiased h-screen w-screen flex overflow-hidden bg-brutal-white`}>

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
