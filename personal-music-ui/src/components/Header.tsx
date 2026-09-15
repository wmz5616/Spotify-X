"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  MessageCircle,
  UserPlus,
  Home,
  ArrowLeft,
  Share2,
  MoreVertical,
  Menu,
  Settings,
  LogOut,
  Heart,
  Clock,
  ListMusic,
  User as UserIcon,
  ShieldCheck
} from "lucide-react";
import { clsx } from "clsx";
import UserMenu from "./UserMenu";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useChatStore } from "@/store/useChatStore";
import { useUserStore } from "@/store/useUserStore";
import { useToastStore } from "@/store/useToastStore";
import AddFriendModal from "./chat/AddFriendModal";

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { setChatOpen, totalUnreadCount, fetchConversations, initSocket } = useChatStore();
  const startPolling = useNotificationStore(state => state.startPolling);
  const stopPolling = useNotificationStore(state => state.stopPolling);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const user = useUserStore(state => state.user);
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const addToast = useToastStore(state => state.addToast);

  const handleAddFriendClick = () => {
    if (!isAuthenticated) {
      addToast("请先登录账户");
      return;
    }
    setIsAddFriendOpen(true);
  };

  const handleChatClick = () => {
    if (!isAuthenticated) {
      addToast("请先登录账户");
      return;
    }
    setChatOpen(true);
  };

  useEffect(() => {
    if (pathname === "/search") {
      if (typeof window !== "undefined") {
        const q = new URLSearchParams(window.location.search).get("q") || "";
        setQuery(q);
      }
    } else {
      setQuery("");
    }
  }, [pathname]);

  useEffect(() => {
    if (!user?.id) return;

    startPolling();
    fetchConversations();
    initSocket(user.id);

    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling, fetchConversations, initSocket, user?.id]);

  useEffect(() => {
    const mainContent = document.getElementById("main-content");
    if (!mainContent) return;

    const handleScroll = () => {
      setIsScrolled(mainContent.scrollTop > 10);
    };

    mainContent.addEventListener("scroll", handleScroll);
    return () => {
      mainContent.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    // Only manage search query URL updates when actively on the search page
    if (pathname !== "/search") return;

    const debounceTimer = setTimeout(() => {
      const trimmed = query.trim();
      const currentQ = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("q") || "") : "";
      if (trimmed !== currentQ) {
        if (trimmed) {
          router.replace(`/search?q=${encodeURIComponent(trimmed)}`);
        } else {
          router.replace(`/search`);
        }
      }
    }, 250);
    return () => clearTimeout(debounceTimer);
  }, [query, pathname, router]);

  const handleSearchChange = (val: string) => {
    setQuery(val);
    if (pathname !== "/search" && val.trim()) {
      router.push(`/search?q=${encodeURIComponent(val.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const trimmed = query.trim();
      if (trimmed && pathname !== "/search") {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }
    }
  };

  const handleClear = () => {
    setQuery("");
    if (pathname === "/search") {
      router.replace("/search");
    }
  };

  const isDetailPage = pathname?.startsWith("/album/") || pathname?.startsWith("/playlist/");
  const isVideoPage = pathname?.startsWith("/video");

  return (
    <header
      suppressHydrationWarning
      className={clsx(
        "sticky -top-[1px] pt-[1px] z-50 h-14 md:h-16 px-4 md:px-6 items-center justify-between transition-all duration-300 ease-in-out select-none",
        isDetailPage ? "hidden md:flex" : "flex",
        isVideoPage && "hidden md:flex",
        isScrolled
          ? "bg-white/95 dark:bg-[#121212]/95 backdrop-blur-xl shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.85)] border-b border-black/5 dark:border-transparent"
          : "bg-white md:bg-transparent dark:bg-[#121212] md:dark:bg-transparent"
      )}
    >
      {/* 移动端搜索栏与菜单按钮 (1:1 复刻目标设计) */}
      {!isDetailPage && !isVideoPage && (
        <div className="flex md:hidden items-center w-full gap-2.5">
          <div className="relative flex-1 flex items-center">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10 text-neutral-400 dark:text-neutral-500">
              <Search size={16} strokeWidth={2} />
            </div>
            <input
              type="text"
              placeholder={pathname === "/library" ? "赵雷 本周飙升黑马" : "搜索歌曲、歌手、专辑"}
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (pathname !== "/search") {
                  router.push(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/search");
                }
              }}
              suppressHydrationWarning
              className="w-full h-[38px] bg-[#ebedf0] hover:bg-[#e4e6ea] focus:bg-white text-neutral-900 border-0 dark:bg-[#1e1e20] dark:hover:bg-[#252528] dark:focus:bg-[#222225] dark:text-white rounded-full pl-9 pr-9 text-[13px] placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none transition-all font-normal shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                title="清空"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1 text-neutral-800 dark:text-neutral-200 hover:text-black dark:hover:text-white active:scale-90 transition shrink-0"
            aria-label="菜单"
          >
            <Menu size={24} strokeWidth={1.8} />
          </button>
        </div>
      )}

      {/* 桌面端顶部栏 */}
      <div className="hidden md:flex items-center justify-between w-full relative">
        {/* 左侧前进后退按钮 */}
        <div className="flex items-center gap-3 min-w-[80px] z-10">
          <button
            onClick={() => router.back()}
            className="rounded-full bg-black/50 flex items-center justify-center w-8 h-8 transition-all hover:bg-neutral-800 text-white hover:scale-105 active:scale-95 border border-white/5"
            title="后退"
          >
            <ChevronLeft size={20} className="translate-x-[-0.5px]" />
          </button>
          <button
            onClick={() => router.forward()}
            className="rounded-full bg-black/50 flex items-center justify-center w-8 h-8 transition-all hover:bg-neutral-800 text-white hover:scale-105 active:scale-95 border border-white/5"
            title="前进"
          >
            <ChevronRight size={20} className="translate-x-[0.5px]" />
          </button>
        </div>

        {/* 居中区域：首页按钮 + 搜索栏（严格水平居中） */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 w-full max-w-sm md:max-w-md px-4 pointer-events-auto z-10">
          <Link
            href="/"
            className={clsx(
              "w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all duration-200 border border-white/5 shadow-inner hover:scale-105 active:scale-95",
              pathname === "/"
                ? "bg-[#282828] text-white shadow-md ring-1 ring-white/20"
                : "bg-[#202020] hover:bg-[#282828] text-neutral-400 hover:text-white"
            )}
            title="首页"
          >
            <Home
              size={20}
              className={clsx(
                "transition-colors",
                pathname === "/" ? "text-green-500" : "text-neutral-400 group-hover:text-white"
              )}
            />
          </Link>

          <div className="relative group/search flex-1 min-w-0">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within/search:text-white transition-colors duration-200">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="想听什么？"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              suppressHydrationWarning
              className="w-full bg-[#202020] hover:bg-[#262626] focus:bg-[#202020] rounded-full py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-neutral-400 focus:outline-none ring-1 ring-transparent focus:ring-2 focus:ring-white/20 transition-all duration-200 border border-transparent shadow-inner"
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors p-0.5 rounded-full hover:bg-white/10"
                title="清空"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* 右侧功能与用户头像操作区 */}
        <div className="flex items-center gap-2.5 min-w-[80px] justify-end z-10">
          <div className="relative">
            <button
              onClick={handleAddFriendClick}
              className="text-neutral-400 hover:text-white transition-colors p-2 hover:bg-neutral-800 rounded-full active:scale-95"
              title="添加好友"
            >
              <UserPlus size={19} />
            </button>
          </div>

          <div className="relative">
            <button
              onClick={handleChatClick}
              className="text-neutral-400 hover:text-white transition-colors p-2 hover:bg-neutral-800 rounded-full relative active:scale-95"
              title="消息"
            >
              <MessageCircle size={19} />
              {totalUnreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
              )}
            </button>
          </div>

          <UserMenu />
        </div>
      </div>

      <AddFriendModal
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
      />

      {/* 移动端汉堡侧边抽屉 */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end md:hidden">
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in"
          />
          <div className="relative w-72 max-w-[80vw] h-full bg-white dark:bg-[#1c1c20] shadow-2xl p-5 flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200">
            <div className="space-y-6">
              {/* 顶部标题与关闭按钮 */}
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                <span className="font-extrabold text-base text-neutral-900 dark:text-white">
                  更多功能
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 用户信息卡片 */}
              {isAuthenticated && user ? (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-black/5 dark:border-white/5">
                  <div className="w-11 h-11 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-base shrink-0">
                    {(user.displayName || user.username || "U")[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                      {user.displayName || user.username}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                      @{user.username}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  href="/library"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block p-3 rounded-2xl bg-[#00d674]/15 border border-[#00d674]/30 text-center"
                >
                  <div className="text-xs font-bold text-[#00d674]">点击登录账户</div>
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">同步您的喜欢音乐与自建歌单</div>
                </Link>
              )}

              {/* 功能列表 */}
              <div className="space-y-1">
                <Link
                  href="/favorites"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 text-sm font-medium transition"
                >
                  <Heart size={18} className="text-rose-500" />
                  <span>我的收藏</span>
                </Link>
                <Link
                  href="/history"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 text-sm font-medium transition"
                >
                  <Clock size={18} className="text-blue-500" />
                  <span>播放历史</span>
                </Link>
                <Link
                  href="/playlists"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 text-sm font-medium transition"
                >
                  <ListMusic size={18} className="text-emerald-500" />
                  <span>我的歌单</span>
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 text-sm font-medium transition"
                >
                  <Settings size={18} className="text-neutral-400" />
                  <span>系统设置</span>
                </Link>
                {user?.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-emerald-500 hover:bg-emerald-500/10 text-sm font-bold transition"
                  >
                    <ShieldCheck size={18} />
                    <span>管理后台</span>
                  </Link>
                )}
              </div>
            </div>

            {/* 底部退出登录 */}
            {isAuthenticated && (
              <div className="border-t border-black/5 dark:border-white/5 pt-3">
                <button
                  onClick={() => {
                    useUserStore.getState().logout();
                    setIsMobileMenuOpen(false);
                    addToast("已退出登录");
                  }}
                  className="flex items-center gap-2.5 text-xs text-rose-500 hover:text-rose-600 font-semibold px-2 py-2"
                >
                  <LogOut size={16} />
                  <span>退出当前账户</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
