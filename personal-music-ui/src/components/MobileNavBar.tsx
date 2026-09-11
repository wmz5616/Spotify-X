"use client";

import React from 'react';
import { Home, TvMinimalPlay, Radio, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePlayerStore } from '@/store/usePlayerStore';

export default function MobileNavBar() {
  const pathname = usePathname();
  const { isFullScreen } = usePlayerStore();

  if (isFullScreen) return null;

  const navItems = [
    {
      icon: Home,
      label: '首页',
      href: '/',
      isActive: pathname === '/',
    },
    {
      icon: TvMinimalPlay,
      label: '视频',
      href: '/video',
      isActive: pathname?.startsWith('/video'),
    },
    {
      icon: Radio,
      label: '刷歌',
      href: '/discover',
      isActive: pathname?.startsWith('/discover'),
    },
    {
      icon: User,
      label: '我的',
      href: '/library',
      isActive:
        pathname?.startsWith('/library') ||
        pathname?.startsWith('/favorites') ||
        pathname?.startsWith('/history') ||
        pathname?.startsWith('/playlists') ||
        pathname?.startsWith('/settings') ||
        pathname?.startsWith('/admin'),
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-xl border-t border-neutral-200 dark:border-white/[0.08] px-3 flex justify-around items-center z-50 select-none transition-colors duration-200 shadow-sm dark:shadow-none">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-4 transition-all active:scale-90 ${
            item.isActive
              ? 'text-emerald-500 dark:text-emerald-400 font-bold'
              : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
          }`}
        >
          <item.icon size={20} strokeWidth={item.isActive ? 2.4 : 1.8} />
          <span className="text-[11px] tracking-tight leading-none">
            {item.label}
          </span>
        </Link>
      ))}
    </nav>
  );
}

