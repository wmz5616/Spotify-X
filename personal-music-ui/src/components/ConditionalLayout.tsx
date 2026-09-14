"use client";

import React, { Suspense } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import Sidebar from "@/components/Sidebar";
import PlayerControls from "@/components/PlayerControls";
import Header from "@/components/Header";
import MobileNavBar from "@/components/MobileNavBar";
import AmbientBackground from "@/components/AmbientBackground";

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith("/admin");

  const isDetailPage = pathname?.startsWith("/album/") || pathname?.startsWith("/playlist/");
  const isVideoPage = pathname?.startsWith("/video");

  if (isAdminPage) {
    return (
      <div className="h-screen bg-black text-white relative">
        <main className="h-full overflow-hidden">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white text-neutral-900 dark:bg-[#121212] dark:text-white relative transition-colors duration-200">
      <AmbientBackground />
      <div className="flex-grow flex min-h-0 relative z-10">
        <Sidebar />
        <main
          id="main-content"
          className={clsx(
            "flex-1 relative transition-colors duration-200",
            isVideoPage
              ? "overflow-hidden bg-black"
              : "overflow-y-auto custom-scrollbar bg-white dark:bg-[#121212]"
          )}
        >
          <Suspense fallback={<div className="h-14 md:h-16" />}>
            <Header />
          </Suspense>
          <div
            className={
              isVideoPage
                ? "p-0 h-full w-full pb-0"
                : isDetailPage
                ? "p-0 sm:p-6 pb-24 md:pb-28"
                : "p-3 sm:p-6 pb-36 md:pb-28"
            }
          >
            {children}
          </div>
        </main>
      </div>
      <div className="relative z-20">
        <PlayerControls />
        {!isDetailPage && <MobileNavBar />}
      </div>
    </div>
  );
}
