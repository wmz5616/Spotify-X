"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function MobileCategoryPills() {
  const pathname = usePathname();

  const categories = [
    { label: "推荐", href: "/", isCurrent: pathname === "/" },
    { label: "刷歌", href: "/discover" },
    { label: "视频", href: "/video" },
    { label: "排行榜", href: "#featured-charts" },
    { label: "歌单", href: "/playlists" },
  ];

  return (
    <div className="md:hidden flex items-center gap-5 overflow-x-auto no-scrollbar pt-0.5 pb-2.5 px-2 mb-2 select-none">
      {categories.map((cat) => (
        <Link
          key={cat.label}
          href={cat.href}
          className={clsx(
            "shrink-0 relative flex flex-col items-center transition-all duration-200 active:scale-95 py-0.5",
            cat.isCurrent
              ? "text-neutral-950 dark:text-white font-bold text-[15px]"
              : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 font-medium text-sm"
          )}
        >
          <span>{cat.label}</span>
          {cat.isCurrent && (
            <span className="absolute -bottom-1 w-3.5 h-[3px] rounded-full bg-[#1ed760] transition-all" />
          )}
        </Link>
      ))}
    </div>
  );
}
