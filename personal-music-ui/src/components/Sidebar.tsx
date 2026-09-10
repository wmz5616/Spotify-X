"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Library,
  ArrowLeft,
  ArrowRight,
  ListMusic,
  Mic2,
} from "lucide-react";
import { clsx } from "clsx";
import type { Playlist, Artist } from "@/types";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useUserStore } from "@/store/useUserStore";
import { apiClient, getAuthenticatedSrc } from "@/lib/api-client";
import { useToastStore } from "@/store/useToastStore";
import UserQuickLinks from "./UserQuickLinks";

const LibrarySkeleton = ({ collapsed }: { collapsed: boolean }) => (
  <div className="space-y-4 p-2 animate-pulse">
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className={clsx(
          "flex items-center",
          collapsed ? "justify-center" : "gap-3"
        )}
      >
        <div className="w-12 h-12 bg-neutral-800 rounded-md shrink-0" />
        {!collapsed && (
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-neutral-800 rounded w-2/3" />
            <div className="h-3 bg-neutral-800 rounded w-1/2" />
          </div>
        )}
      </div>
    ))}
  </div>
);

const Sidebar = () => {
  const pathname = usePathname();
  const { isCollapsed: isSidebarCollapsed, toggle: toggleSidebar } = useSidebarStore();
  const { isAuthenticated } = useUserStore();
  const { addToast } = useToastStore();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Floating tooltip state for collapsed mode
  const [activeTooltip, setActiveTooltip] = useState<{
    text: string;
    subtext?: string;
    top: number;
  } | null>(null);

  const showTooltip = (e: React.MouseEvent, text: string, subtext?: string) => {
    if (!isSidebarCollapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveTooltip({
      text,
      subtext,
      top: rect.top + rect.height / 2,
    });
  };

  const hideTooltip = () => {
    setActiveTooltip(null);
  };

  // Hydration guard to prevent flash of unstyled/wrong-state content
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [playlistsData, artistsData] = await Promise.all([
        isAuthenticated ? apiClient<Playlist[]>("/api/user-playlists") : Promise.resolve([]),
        apiClient<Artist[]>("/api/artists"),
      ]);

      setPlaylists(playlistsData || []);
      setArtists(artistsData || []);
      setError(false);
    } catch (e) {
      console.error("Sidebar data fetch failed:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAuthenticated]);

  return (
    <aside
      className={clsx(
        "hidden md:flex flex-col h-full bg-black p-2 gap-2 transition-all duration-300 ease-in-out z-40 select-none",
        isSidebarCollapsed ? "w-[80px]" : "w-[300px]",
        !isHydrated && "opacity-0"
      )}
    >
      <UserQuickLinks collapsed={isSidebarCollapsed} />

      {/* 音乐库卡片 */}
      <div className="flex-1 rounded-xl bg-[#121212] overflow-hidden flex flex-col shadow-lg border border-white/5 relative">
        {/* 顶部固定标题栏：设置不透明背景 bg-[#121212]，通过自然柔和投影与微偏移彻底杜绝任何白线 */}
        <div className="px-4 py-3.5 sticky -top-[1px] pt-[15px] z-20 bg-[#121212] shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
          <div
            className={clsx(
              "flex items-center justify-between text-neutral-400",
              isSidebarCollapsed && "flex-col gap-3"
            )}
          >
            <div
              onClick={isSidebarCollapsed ? toggleSidebar : undefined}
              onMouseEnter={(e) => showTooltip(e, "音乐库", isSidebarCollapsed ? "点击展开" : undefined)}
              onMouseLeave={hideTooltip}
              className={clsx(
                "flex items-center gap-x-2.5 hover:text-white transition cursor-pointer group",
                isSidebarCollapsed && "justify-center p-1"
              )}
              title={isSidebarCollapsed ? "展开音乐库" : undefined}
            >
              <Library size={24} className="group-hover:text-white transition-colors" />
              {!isSidebarCollapsed && (
                <p className="font-bold text-sm tracking-wide">音乐库</p>
              )}
            </div>
            <button
              onClick={toggleSidebar}
              onMouseEnter={(e) => showTooltip(e, isSidebarCollapsed ? "展开侧边栏" : "折叠侧边栏")}
              onMouseLeave={hideTooltip}
              className="hover:text-white text-neutral-400 transition-colors p-1.5 hover:bg-neutral-800/80 rounded-full"
              title={isSidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
            >
              {isSidebarCollapsed ? (
                <ArrowRight size={18} />
              ) : (
                <ArrowLeft size={18} />
              )}
            </button>
          </div>
        </div>

        {/* 音乐库可滚动内容区域 */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 no-scrollbar">
          {loading ? (
            <LibrarySkeleton collapsed={isSidebarCollapsed} />
          ) : error ? (
            <div className="text-center text-red-400 text-sm mt-4">
              {!isSidebarCollapsed && "加载音乐库失败"}
            </div>
          ) : (
            <div className="space-y-1">
              {playlists.map((playlist) => {
                const isActive = pathname === `/playlist/${playlist.id}`;
                return (
                  <Link
                    key={`playlist-${playlist.id}`}
                    href={`/playlist/${playlist.id}`}
                    onMouseEnter={(e) => showTooltip(e, playlist.name, "歌单")}
                    onMouseLeave={hideTooltip}
                    className={clsx(
                      "flex items-center gap-x-3 p-2 rounded-lg cursor-pointer group transition-all duration-200",
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-neutral-400 hover:text-white hover:bg-white/5",
                      isSidebarCollapsed && "justify-center"
                    )}
                  >
                    <div
                      className={clsx(
                        "w-12 h-12 bg-neutral-800 rounded-md flex items-center justify-center shrink-0 transition-all duration-200 shadow-sm border border-white/5",
                        isActive
                          ? "ring-2 ring-green-500 shadow-[0_0_12px_rgba(30,215,96,0.4)]"
                          : "group-hover:bg-neutral-700"
                      )}
                    >
                      <ListMusic
                        className={clsx(
                          "transition-colors",
                          isActive ? "text-green-400" : "text-neutral-400 group-hover:text-white"
                        )}
                        size={24}
                      />
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="flex flex-col overflow-hidden min-w-0">
                        <p
                          className={clsx(
                            "truncate font-medium text-[14px]",
                            isActive ? "text-white font-semibold" : "text-neutral-200"
                          )}
                        >
                          {playlist.name}
                        </p>
                        <p className="text-xs text-neutral-400 truncate">
                          歌单
                        </p>
                      </div>
                    )}
                  </Link>
                );
              })}

              {artists.map((artist) => {
                const avatarUrl = artist.avatarUrl
                  ? getAuthenticatedSrc(artist.avatarUrl, 100)
                  : null;

                const artistHref = artist.id
                  ? `/artist/${encodeURIComponent(artist.name)}?id=${artist.id}`
                  : `/artist/${encodeURIComponent(artist.name)}`;

                const isActive =
                  pathname === `/artist/${encodeURIComponent(artist.name)}` ||
                  pathname === `/artist/${artist.name}`;

                return (
                  <Link
                    key={`artist-${artist.id}`}
                    href={artistHref}
                    onMouseEnter={(e) => showTooltip(e, artist.name, "艺人")}
                    onMouseLeave={hideTooltip}
                    className={clsx(
                      "flex items-center gap-x-3 p-2 rounded-lg cursor-pointer group transition-all duration-200 relative",
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-neutral-400 hover:text-white hover:bg-white/5",
                      isSidebarCollapsed && "justify-center"
                    )}
                  >
                    <div
                      className={clsx(
                        "w-12 h-12 relative rounded-full overflow-hidden bg-neutral-800 shrink-0 flex items-center justify-center border border-white/5 shadow-sm transition-all duration-200",
                        isActive
                          ? "ring-2 ring-green-500 shadow-[0_0_12px_rgba(30,215,96,0.45)] scale-105"
                          : "group-hover:scale-105"
                      )}
                    >
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          fill
                          alt={artist.name}
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <Mic2 className="text-neutral-400" size={24} />
                      )}
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="flex flex-col overflow-hidden min-w-0">
                        <p
                          className={clsx(
                            "truncate font-medium text-[14px]",
                            isActive ? "text-white font-semibold" : "text-neutral-200"
                          )}
                        >
                          {artist.name}
                        </p>
                        <p className="text-xs text-neutral-400 truncate">
                          艺人
                        </p>
                      </div>
                    )}
                  </Link>
                );
              })}

              {!loading && playlists.length === 0 && artists.length === 0 && (
                <div className="p-4 text-center text-neutral-400 text-sm">
                  {!isSidebarCollapsed && "暂无音乐"}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 折叠状态下的浮动 Tooltip（通过 fixed 定位，完全不受父级 overflow-hidden 裁剪） */}
      {isSidebarCollapsed && activeTooltip && (
        <div
          className="fixed left-[90px] -translate-y-1/2 z-[9999] pointer-events-none transition-opacity duration-150"
          style={{ top: `${activeTooltip.top}px` }}
        >
          <div className="bg-[#282828] text-white text-xs font-medium px-3 py-1.5 rounded-md shadow-[0_4px_16px_rgba(0,0,0,0.6)] border border-white/10 whitespace-nowrap flex items-center gap-1.5 backdrop-blur-md">
            <span className="font-semibold text-white">{activeTooltip.text}</span>
            {activeTooltip.subtext && (
              <span className="text-neutral-400 text-[11px]">
                · {activeTooltip.subtext}
              </span>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
