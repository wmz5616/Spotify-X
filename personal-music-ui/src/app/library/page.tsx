"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Heart,
  History,
  ListMusic,
  Settings,
  User as UserIcon,
  Plus,
  Play,
  MessageCircle,
  UserPlus,
  LogOut,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useChatStore } from "@/store/useChatStore";
import { useToastStore } from "@/store/useToastStore";
import { getAuthenticatedSrc } from "@/lib/api-client";
import AuthModal from "@/components/AuthModal";
import AddFriendModal from "@/components/chat/AddFriendModal";
import type { Song } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface UserPlaylist {
  id: number;
  name: string;
  coverPath?: string | null;
  _count?: {
    songs: number;
  };
}

export default function LibraryPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, logout } = useUserStore();
  const { favoriteSongIds, initializeFavorites } = useFavoritesStore();
  const { playSong } = usePlayerStore();
  const { setChatOpen, totalUnreadCount } = useChatStore();
  const { addToast } = useToastStore();

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [recentFavoriteSongs, setRecentFavoriteSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUserData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      // 1. 获取自建歌单
      const plRes = await fetch(`${API_BASE_URL}/api/user-playlists`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (plRes.ok) {
        const plData = await plRes.json();
        setPlaylists(Array.isArray(plData) ? plData : []);
      }

      // 2. 获取收藏歌曲前几首
      const favRes = await fetch(`${API_BASE_URL}/api/favorites/songs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (favRes.ok) {
        const favData = await favRes.json();
        if (Array.isArray(favData)) {
          // 适配可能的数据格式
          const mappedSongs: Song[] = favData.slice(0, 5).map((item: any) => ({
            id: item.id,
            title: item.title,
            artist: item.artists?.[0]?.name || item.album?.artists?.[0]?.name || "未知歌手",
            year: item.year || null,
            trackNumber: item.trackNumber || null,
            duration: item.duration || 0,
            album: item.album
              ? {
                  id: item.album.id || 0,
                  title: item.album.title || "未知专辑",
                  coverPath: item.album.coverPath || item.coverPath || null,
                  artists: item.album.artists || [],
                }
              : undefined,
          }));
          setRecentFavoriteSongs(mappedSongs);
        }
      }
    } catch (e) {
      console.error("加载个人数据失败:", e);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) {
      initializeFavorites();
      fetchUserData();
    } else {
      setPlaylists([]);
      setRecentFavoriteSongs([]);
    }
  }, [isAuthenticated, initializeFavorites, fetchUserData]);

  const handleLogout = () => {
    logout();
    addToast("已退出登录");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 select-none">
      {/* 顶部个人卡片 */}
      <div className="bg-[#18181a] border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        {isAuthenticated && user ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-neutral-800 border-2 border-white/10 shrink-0 flex items-center justify-center">
                {user.avatarPath ? (
                  <Image
                    src={getAuthenticatedSrc(user.avatarPath)}
                    alt={user.displayName || user.username || "用户头像"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-white uppercase">
                    {(user.displayName || user.username || "U")[0]}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                    {user.displayName || user.username}
                  </h2>
                  {user.role === "ADMIN" && (
                    <span className="bg-green-500/20 text-green-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-green-500/30">
                      管理员
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 truncate mt-0.5">
                  @{user.username}
                </p>
                <Link
                  href={`/${user.username}`}
                  className="inline-flex items-center gap-1 text-[11px] text-[#1ed760] hover:underline mt-1.5"
                >
                  查看个人主页 <ChevronRight size={12} />
                </Link>
              </div>
            </div>

            {/* 快捷操作群 */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t border-white/5 pt-3 sm:pt-0 sm:border-0">
              <button
                onClick={() => setIsAddFriendOpen(true)}
                className="flex items-center gap-1.5 bg-[#252528] hover:bg-[#2e2e32] active:scale-95 text-neutral-200 text-xs px-3 py-2 rounded-full border border-white/5 transition-all"
                title="添加好友"
              >
                <UserPlus size={14} />
                <span>加好友</span>
              </button>

              <button
                onClick={() => setChatOpen(true)}
                className="relative flex items-center gap-1.5 bg-[#252528] hover:bg-[#2e2e32] active:scale-95 text-neutral-200 text-xs px-3 py-2 rounded-full border border-white/5 transition-all"
                title="消息"
              >
                <MessageCircle size={14} />
                <span>消息</span>
                {totalUnreadCount > 0 && (
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 active:scale-95 text-xs px-3 py-2 rounded-full border border-red-500/20 transition-all"
                title="退出登录"
              >
                <LogOut size={14} />
                <span>退出</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setIsAuthOpen(true)}
            className="flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#242426] flex items-center justify-center text-neutral-400 group-hover:text-white transition-colors border border-white/5">
                <UserIcon size={30} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white group-hover:text-[#1ed760] transition-colors">
                  点击登录 Spotify-X
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  登录后同步喜欢音乐、自建歌单与播放历史
                </p>
              </div>
            </div>
            <span className="bg-[#1ed760] hover:bg-[#1db954] text-black text-xs font-bold px-4 py-2 rounded-full transition-all active:scale-95 shadow-md">
              登录 / 注册
            </span>
          </div>
        )}
      </div>

      {/* 4 宫格金刚区快捷导航（类似 QQ 音乐） */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/favorites"
          className="bg-[#18181a] hover:bg-[#202024] border border-white/5 p-4 rounded-xl flex items-center gap-3.5 transition-all active:scale-95 group"
        >
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
            <Heart size={20} className="fill-red-500/20" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">喜欢音乐</div>
            <div className="text-[11px] text-neutral-400">
              {isAuthenticated ? `${favoriteSongIds.size} 首` : "快捷收藏"}
            </div>
          </div>
        </Link>

        <Link
          href="/history"
          className="bg-[#18181a] hover:bg-[#202024] border border-white/5 p-4 rounded-xl flex items-center gap-3.5 transition-all active:scale-95 group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
            <History size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">最近播放</div>
            <div className="text-[11px] text-neutral-400">播放历史</div>
          </div>
        </Link>

        <Link
          href="/playlists"
          className="bg-[#18181a] hover:bg-[#202024] border border-white/5 p-4 rounded-xl flex items-center gap-3.5 transition-all active:scale-95 group"
        >
          <div className="w-10 h-10 rounded-lg bg-[#1ed760]/10 flex items-center justify-center text-[#1ed760] group-hover:scale-110 transition-transform">
            <ListMusic size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">自建歌单</div>
            <div className="text-[11px] text-neutral-400">
              {isAuthenticated ? `${playlists.length} 个` : "个性整理"}
            </div>
          </div>
        </Link>

        <Link
          href="/settings"
          className="bg-[#18181a] hover:bg-[#202024] border border-white/5 p-4 rounded-xl flex items-center gap-3.5 transition-all active:scale-95 group"
        >
          <div className="w-10 h-10 rounded-lg bg-neutral-500/10 flex items-center justify-center text-neutral-300 group-hover:scale-110 transition-transform">
            <Settings size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">设置中心</div>
            <div className="text-[11px] text-neutral-400">昼夜模式与偏好</div>
          </div>
        </Link>
      </div>

      {/* 管理员专属入口（如适用） */}
      {isAuthenticated && user?.role === "ADMIN" && (
        <Link
          href="/admin"
          className="flex items-center justify-between bg-gradient-to-r from-purple-950/30 to-[#18181a] border border-purple-500/20 p-3.5 rounded-xl text-purple-300 text-xs font-semibold hover:border-purple-500/40 transition-all"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} />
            <span>进入后台管理系统</span>
          </div>
          <ChevronRight size={14} />
        </Link>
      )}

      {/* 我的歌单模块 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>自建歌单</span>
            {playlists.length > 0 && (
              <span className="text-xs text-neutral-500 font-normal">
                ({playlists.length})
              </span>
            )}
          </h3>
          <Link
            href="/playlists"
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>管理全部</span>
            <ChevronRight size={13} />
          </Link>
        </div>

        {isAuthenticated ? (
          playlists.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {playlists.slice(0, 4).map((pl) => (
                <Link
                  key={pl.id}
                  href={`/playlist/${pl.id}`}
                  className="bg-[#18181a] hover:bg-[#202024] border border-white/5 rounded-xl p-3 flex flex-col gap-2 transition-all active:scale-95 group"
                >
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-neutral-800 border border-white/5">
                    {pl.coverPath ? (
                      <Image
                        src={getAuthenticatedSrc(pl.coverPath)}
                        alt={pl.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-500">
                        <ListMusic size={28} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-white truncate">
                      {pl.name}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {pl._count?.songs || 0} 首歌曲
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-[#18181a] border border-white/5 rounded-xl p-6 text-center">
              <p className="text-xs text-neutral-400 mb-3">暂无自建歌单</p>
              <Link
                href="/playlists"
                className="inline-flex items-center gap-1.5 bg-white text-black text-xs font-bold px-4 py-2 rounded-full hover:bg-neutral-200 transition-all active:scale-95"
              >
                <Plus size={14} />
                <span>立即创建歌单</span>
              </Link>
            </div>
          )
        ) : (
          <div className="bg-[#18181a] border border-white/5 rounded-xl p-6 text-center">
            <p className="text-xs text-neutral-400 mb-3">登录后即可创建与同步歌单</p>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="inline-flex items-center gap-1.5 bg-[#1ed760] text-black text-xs font-bold px-4 py-2 rounded-full hover:bg-[#1db954] transition-all active:scale-95"
            >
              登录账户
            </button>
          </div>
        )}
      </div>

      {/* 喜欢音乐快捷播放列表 */}
      {isAuthenticated && recentFavoriteSongs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>喜欢的音乐</span>
              <span className="text-xs text-neutral-500 font-normal">
                (最近收藏)
              </span>
            </h3>
            <Link
              href="/favorites"
              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>查看全部</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <div className="bg-[#18181a] border border-white/5 rounded-xl divide-y divide-white/5 overflow-hidden">
            {recentFavoriteSongs.map((song) => (
              <div
                key={song.id}
                onClick={() => playSong(song, recentFavoriteSongs)}
                className="flex items-center justify-between p-3 hover:bg-white/5 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-800 shrink-0 border border-white/5">
                    <Image
                      src={getAuthenticatedSrc(song.album?.coverPath || "/placeholder.jpg")}
                      alt={song.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={16} className="text-white fill-white ml-0.5" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-medium text-white truncate">
                      {song.title}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {song.artist}
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playSong(song, recentFavoriteSongs);
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0 ml-2 active:scale-95"
                  title="播放"
                >
                  <Play size={14} className="fill-current ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 登录模态框 */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode="login"
      />

      {/* 添加好友模态框 */}
      <AddFriendModal
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
      />
    </div>
  );
}
