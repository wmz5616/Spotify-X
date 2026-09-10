"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, X, MessageCircle, UserPlus, Home } from "lucide-react";
import { clsx } from "clsx";
import UserMenu from "./UserMenu";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useChatStore } from "@/store/useChatStore";
import { useUserStore } from "@/store/useUserStore";
import AddFriendModal from "./chat/AddFriendModal";

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQ = searchParams?.get("q") || "";
  const [query, setQuery] = useState(urlQ);
  const [isScrolled, setIsScrolled] = useState(false);
  const { setChatOpen, totalUnreadCount, fetchConversations, initSocket } = useChatStore();
  const startPolling = useNotificationStore(state => state.startPolling);
  const stopPolling = useNotificationStore(state => state.stopPolling);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const user = useUserStore(state => state.user);

  useEffect(() => {
    if (pathname === "/search") {
      setQuery(urlQ);
    } else {
      setQuery("");
    }
  }, [pathname, urlQ]);

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
      if (trimmed !== urlQ) {
        if (trimmed) {
          router.replace(`/search?q=${encodeURIComponent(trimmed)}`);
        } else {
          router.replace(`/search`);
        }
      }
    }, 250);
    return () => clearTimeout(debounceTimer);
  }, [query, pathname, urlQ, router]);

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

  return (
    <header
      className={clsx(
        "sticky -top-[1px] pt-[1px] z-50 h-16 px-6 flex items-center justify-between transition-all duration-300 ease-in-out relative select-none",
        isScrolled
          ? "bg-[#121212]/95 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.85)]"
          : "bg-transparent"
      )}
    >
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
      <div className="flex items-center gap-3 min-w-[80px] justify-end z-10">
        <div className="relative">
          <button
            onClick={() => setIsAddFriendOpen(true)}
            className="text-neutral-400 hover:text-white transition-colors p-2 hover:bg-neutral-800 rounded-full"
            title="添加好友"
          >
            <UserPlus size={19} />
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setChatOpen(true)}
            className="text-neutral-400 hover:text-white transition-colors p-2 hover:bg-neutral-800 rounded-full relative"
            title="聊天"
          >
            <MessageCircle size={19} />
            {totalUnreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
            )}
          </button>
        </div>

        <UserMenu />

        <AddFriendModal
          isOpen={isAddFriendOpen}
          onClose={() => setIsAddFriendOpen(false)}
        />
      </div>
    </header>
  );
};

export default Header;
