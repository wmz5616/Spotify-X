"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  Library,
  ArrowLeft,
  ArrowRight,
  ListMusic,
  Mic2,
  RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import type { Playlist, Artist } from "@/types";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useSidebarStore } from "@/store/useSidebarStore";
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
  const { addToast } = useToastStore();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydration guard to prevent flash of unstyled/wrong-state content
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [playlistsData, artistsData] = await Promise.all([
        apiClient<Playlist[]>("/api/playlists"),
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
  }, []);

  const handleScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    addToast("正在发起全量扫描...", <RefreshCw className="animate-spin" />);

    try {
      await apiClient("/api/library/scan?force=true", { method: "POST" });
      addToast("扫描任务已在后台启动");
    } catch (e) {
      console.error("Scan trigger failed:", e);
      addToast("扫描启动失败，请检查控制台");
    } finally {
      setTimeout(() => setIsScanning(false), 2000);
    }
  };

  const routes = [
    {
      label: "首页",
      icon: Home,
      href: "/",
      active: pathname === "/",
    },
    {
      label: "搜索",
      icon: Search,
      href: "/search",
      active: pathname === "/search",
    },
  ];

  return (
    <div
      className={clsx(
        "hidden md:flex flex-col h-full bg-black p-2 gap-2 transition-all duration-300 ease-in-out z-40 transition-opacity duration-300",
        isSidebarCollapsed ? "w-[80px]" : "w-[300px]",
        !isHydrated && "opacity-0"
      )}
    >

      <div className="rounded-xl bg-[#121212] px-5 py-4 flex flex-col gap-y-4 shadow-lg border border-white/5">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={clsx(
              "flex items-center gap-x-4 text-neutral-400 hover:text-white transition cursor-pointer font-bold",
              route.active && "text-green-500",
              isSidebarCollapsed && "justify-center"
            )}
          >
            <route.icon size={26} />
            {!isSidebarCollapsed && <p className="truncate">{route.label}</p>}
          </Link>
        ))}

        <button
          onClick={handleScan}
          disabled={isScanning}
          className={clsx(
            "flex items-center gap-x-4 text-neutral-400 hover:text-white transition cursor-pointer w-full font-bold",
            isScanning && "opacity-50 cursor-not-allowed",
            isSidebarCollapsed && "justify-center"
          )}
        >
          <RefreshCw size={26} className={clsx(isScanning && "animate-spin")} />
          {!isSidebarCollapsed && <p className="truncate">刷新</p>}
        </button>
      </div>

      <UserQuickLinks collapsed={isSidebarCollapsed} />

      <div className="flex-1 rounded-xl bg-[#121212] overflow-hidden flex flex-col shadow-lg border border-white/5">
        <div className="p-4 shadow-md z-10">
          <div
            className={clsx(
              "flex items-center justify-between text-neutral-400",
              isSidebarCollapsed && "flex-col gap-4"
            )}
          >
            <div
              className={clsx(
                "flex items-center gap-x-2 hover:text-white transition cursor-pointer",
                isSidebarCollapsed && "justify-center"
              )}
            >
              <Library size={26} />
              {!isSidebarCollapsed && (
                <p className="font-bold truncate">音乐库</p>
              )}
            </div>
            <button
              onClick={toggleSidebar}
              className="hover:text-white transition p-2 hover:bg-neutral-800 rounded-full"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? (
                <ArrowRight size={20} />
              ) : (
                <ArrowLeft size={20} />
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
          {loading ? (
            <LibrarySkeleton collapsed={isSidebarCollapsed} />
          ) : error ? (
            <div className="text-center text-red-400 text-sm mt-4">
              {!isSidebarCollapsed && "Error loading library"}
            </div>
          ) : (
            <div className="space-y-1">
              {playlists.map((playlist) => (
                <Link
                  key={`playlist-${playlist.id}`}
                  href={`/playlist/${playlist.id}`}
                  className={clsx(
                    "flex items-center gap-x-3 p-2 rounded-md hover:bg-[#1f1f1f] cursor-pointer group transition",
                    pathname === `/playlist/${playlist.id}` &&
                    "bg-[#232323] text-green-500",
                    isSidebarCollapsed && "justify-center"
                  )}
                >
                  <div className="w-12 h-12 bg-neutral-800 rounded-md flex items-center justify-center shrink-0 group-hover:bg-neutral-700 transition shadow-sm border border-white/5">
                    <ListMusic
                      className={clsx(
                        "text-neutral-400 group-hover:text-white",
                        pathname === `/playlist/${playlist.id}` &&
                        "text-green-500"
                      )}
                      size={24}
                    />
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex flex-col overflow-hidden">
                      <p
                        className={clsx(
                          "truncate font-medium text-[15px]",
                          pathname === `/playlist/${playlist.id}`
                            ? "text-green-500"
                            : "text-white"
                        )}
                      >
                        {playlist.name}
                      </p>
                      <p className="text-sm text-neutral-400 truncate">
                        Playlist
                      </p>
                    </div>
                  )}
                </Link>
              ))}

              {artists.map((artist) => {
                let avatarUrl = null;
                if (artist.avatarUrl) {
                  const pathWithPublic = artist.avatarUrl.startsWith("/public")
                    ? artist.avatarUrl
                    : `/public${artist.avatarUrl}`;
                  avatarUrl = getAuthenticatedSrc(pathWithPublic);
                }

                return (
                  <Link
                    key={`artist-${artist.id}`}
                    href={`/artist/${encodeURIComponent(artist.name)}`}
                    className={clsx(
                      "flex items-center gap-x-3 p-2 rounded-md hover:bg-[#1f1f1f] cursor-pointer group transition",
                      pathname === `/artist/${encodeURIComponent(artist.name)}` &&
                      "bg-[#232323] text-green-500",
                      isSidebarCollapsed && "justify-center"
                    )}
                  >
                    <div className="w-12 h-12 relative rounded-full overflow-hidden bg-neutral-800 shrink-0 flex items-center justify-center border border-white/5 shadow-sm">
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
                      <div className="flex flex-col overflow-hidden">
                        <p
                          className={clsx(
                            "truncate font-medium text-[15px]",
                          pathname === `/artist/${encodeURIComponent(artist.name)}`
                            ? "text-green-500"
                            : "text-white"
                          )}
                        >
                          {artist.name}
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
    </div>
  );
};

export default Sidebar;
