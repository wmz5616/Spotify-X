"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Bell } from "lucide-react";
import { clsx } from "clsx";
import UserMenu from "./UserMenu";
import NotificationPopover from "./NotificationPopover";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useChatStore } from "@/store/useChatStore";
import { useUserStore } from "@/store/useUserStore";
import { MessageCircle, UserPlus } from "lucide-react";
import AddFriendModal from "./chat/AddFriendModal";

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQ = searchParams?.get("q") || "";
  const [query, setQuery] = useState(urlQ);
  const [isScrolled, setIsScrolled] = useState(false);
  const unreadCount = useNotificationStore(state => state.getUnreadCount());
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
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, pathname, urlQ, router]);

  const showSearchBar = pathname === "/search";

  return (
    <header
      className={clsx(
        "sticky top-0 z-50 h-16 px-6 flex items-center justify-between transition-all duration-400 ease-in-out",
        isScrolled
          ? "bg-black/40 backdrop-blur-xl border-b border-white/5 shadow-md"
          : "bg-transparent"
      )}
    >
      <div className="flex items-center gap-4 min-w-[80px]">
        <button
          onClick={() => router.back()}
          className="rounded-full bg-black/40 flex items-center justify-center w-8 h-8 transition hover:bg-black/60 border border-transparent hover:border-white/10"
          title="Go Back"
        >
          <ChevronLeft size={22} className="text-white translate-x-[-1px]" />
        </button>
        <button
          onClick={() => router.forward()}
          className="rounded-full bg-black/40 flex items-center justify-center w-8 h-8 transition hover:bg-black/60 border border-transparent hover:border-white/10"
          title="Go Forward"
        >
          <ChevronRight size={22} className="text-white translate-x-[1px]" />
        </button>
      </div>

      <div className="flex-1 max-w-md px-4">
        {showSearchBar ? (
          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-white transition-colors">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="搜索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#242424] rounded-full py-3 pl-10 pr-4 text-sm text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all border border-transparent focus:border-white/10"
              autoFocus
            />
          </div>
        ) : (
          <div />
        )}
      </div>

      <div className="flex items-center gap-4 min-w-[80px] justify-end">
        <div className="relative">
          <button
            onClick={() => setIsAddFriendOpen(true)}
            className="text-neutral-400 hover:text-white transition p-2 hover:bg-neutral-800 rounded-full"
            title="添加好友"
          >
            <UserPlus size={20} />
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setChatOpen(true)}
            className="text-neutral-400 hover:text-white transition p-2 hover:bg-neutral-800 rounded-full relative"
          >
            <MessageCircle size={20} />
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

