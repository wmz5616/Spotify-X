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
    <div className="h-screen flex flex-col bg-black text-white relative">
      <AmbientBackground />
      <div className="flex-grow flex min-h-0 relative z-10">
        <Sidebar />
        <main id="main-content" className="flex-1 overflow-y-auto relative custom-scrollbar">
          <Header />
          <div className="p-6 pb-32 md:pb-6">{children}</div>
        </main>
      </div>
      <div className="relative z-20">
        <MobileNavBar />
        <PlayerControls />
      </div>
    </div>
  );
}
