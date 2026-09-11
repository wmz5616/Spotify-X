"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PlayerControls from "@/components/PlayerControls";
import Header from "@/components/Header";
import MobileNavBar from "@/components/MobileNavBar";
import AmbientBackground from "@/components/AmbientBackground";

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith("/admin");

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
        <main id="main-content" className="flex-1 overflow-y-auto relative custom-scrollbar bg-white dark:bg-[#121212] transition-colors duration-200">
          <Header />
          <div className="p-3 sm:p-6 pb-36 md:pb-28">{children}</div>
        </main>
      </div>
      <div className="relative z-20">
        <PlayerControls />
        <MobileNavBar />
      </div>
    </div>
  );
}
