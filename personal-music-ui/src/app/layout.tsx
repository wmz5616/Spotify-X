import type { Metadata } from "next";
import "./globals.css";
import AudioPlayer from "@/components/AudioPlayer";
import NowPlayingView from "@/components/NowPlayingView";
import GlobalKeyboardShortcuts from "@/components/GlobalKeyboardShortcuts";
import ToastContainer from "@/components/ToastContainer";
import ThemeProvider from "@/components/ThemeProvider";
import AppInitializer from "@/components/AppInitializer";
import ChatModalWrapper from "@/components/chat/ChatModalWrapper";

// Removed Inter font to bypass Turbopack issue

export const metadata: Metadata = {
  title: "Spotify",
  description: "Your personal music library",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
};

import ConditionalLayout from "@/components/ConditionalLayout";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AppInitializer>
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
            <AudioPlayer />
            <NowPlayingView />
            <GlobalKeyboardShortcuts />
            <ToastContainer />
            <ChatModalWrapper />
          </AppInitializer>
        </ThemeProvider>
      </body>
    </html>
  );
}