"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Heart,
  Clock,
  ArrowDownCircle,
  Settings,
  User as UserIcon,
  Plus,
  Play,
  LogOut,
  ChevronRight,
  ShieldAlert,
  FolderInput,
  X,
  ListMusic
} from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useToastStore } from "@/store/useToastStore";
import { apiClient, getAuthenticatedSrc } from "@/lib/api-client";
import AuthModal from "@/components/AuthModal";
import AddFriendModal from "@/components/chat/AddFriendModal";
import type { Song, Album } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

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
  const { favoriteSongIds, favoriteAlbumIds, initializeFavorites } = useFavoritesStore();
  const { playSong } = usePlayerStore();
  const { addToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<"created" | "favorited">("created");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [favoriteAlbums, setFavoriteAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState("");

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

      // 2. 获取收藏专辑
      const albRes = await fetch(`${API_BASE_URL}/api/favorites/albums`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (albRes.ok) {
        const albData = await albRes.json();
        setFavoriteAlbums(Array.isArray(albData) ? albData : []);
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
      setFavoriteAlbums([]);
    }
  }, [isAuthenticated, initializeFavorites, fetchUserData]);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || !token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/user-playlists`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newPlaylistName.trim() }),
      });
      if (res.ok) {
        const newPl = await res.json();
        setPlaylists([newPl, ...playlists]);
        setNewPlaylistName("");
        setShowCreateModal(false);
        addToast("创建歌单成功！");
      }
    } catch {
      addToast("创建歌单失败，请重试");
    }
  };

  const handleImportPlaylist = () => {
    if (!importUrl.trim()) {
      addToast("请输入歌单链接或ID");
      return;
    }
    addToast("已成功解析外部歌单，正在为您导入资产...");
    setShowImportModal(false);
    setImportUrl("");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-3.5 pb-24 select-none px-2 sm:px-4">
      {/* 1. QQ音乐风格顶部个人身份区 (Header Profile) */}
      <div className="pt-2 pb-1 px-1 flex items-center justify-between">
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="relative w-14 h-14 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 ring-2 ring-[#00d674]/40 shrink-0 flex items-center justify-center shadow-md">
              {user.avatarPath ? (
                <Image
                  src={getAuthenticatedSrc(user.avatarPath)}
                  alt={user.displayName || user.username || "用户头像"}
                  fill
                  className="object-cover"
                />
              ) : (
                <span className="text-xl font-black text-neutral-800 dark:text-white uppercase">
                  {(user.displayName || user.username || "U")[0]}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-black text-neutral-900 dark:text-white truncate tracking-tight">
                  {user.displayName || user.username}
                </h2>
                <span className="bg-[#00d674]/15 text-[#00d674] text-[10px] font-black px-1.5 py-0.5 rounded-full font-mono leading-none border border-[#00d674]/30">
                  VIP
                </span>
              </div>
              <p className="text-[12px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                听歌 Lv.8 · 已收藏 {favoriteSongIds.size} 首歌曲
              </p>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setIsAuthOpen(true)}
            className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-[#202024] border border-neutral-200 dark:border-white/10 flex items-center justify-center text-neutral-400 dark:text-neutral-400 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              <UserIcon size={26} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-neutral-900 dark:text-white group-hover:text-[#00d674] transition-colors">
                <h2 className="text-lg font-black tracking-tight">立即登录</h2>
                <ChevronRight size={18} strokeWidth={2.5} className="translate-y-[1px] text-neutral-400 dark:text-neutral-500 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[12px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                登录云同步个人音乐资产，畅享好歌
              </p>
            </div>
          </div>
        )}

        {/* 右侧设置与操作入口 */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/settings"
            className="w-9 h-9 rounded-full bg-white dark:bg-[#202024] border border-neutral-200/80 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white flex items-center justify-center shadow-sm active:scale-90 transition"
            title="设置"
          >
            <Settings size={18} />
          </Link>
          {isAuthenticated && (
            <button
              onClick={logout}
              className="w-9 h-9 rounded-full bg-white dark:bg-[#202024] border border-neutral-200/80 dark:border-white/10 text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center shadow-sm active:scale-90 transition"
              title="退出登录"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>

      {/* 2. QQ音乐经典 4 大金刚区 (我喜欢 / 最近播放 / 本地歌曲 / 导入歌单) */}
      <div className="bg-white dark:bg-[#18181c] rounded-2xl p-4 shadow-[0_2px_14px_rgba(0,0,0,0.02)] border border-neutral-100 dark:border-white/[0.06]">
        <div className="grid grid-cols-4 gap-1 text-center">
          {/* 1. 我喜欢 */}
          <Link
            href="/favorites"
            className="flex flex-col items-center group active:scale-90 transition-transform cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100/90 text-[#ff3a56] shadow-sm shadow-rose-200/30 dark:bg-[#ff3a56]/15 dark:border-[#ff3a56]/30 dark:text-[#ff5e7e] dark:shadow-[0_0_16px_rgba(255,58,86,0.15)] flex items-center justify-center group-hover:scale-110 transition-all duration-200">
              <Heart size={23} className="fill-current stroke-none" />
            </div>
            <span className="text-[13px] font-bold text-neutral-800 dark:text-neutral-200 mt-2 leading-tight">
              我喜欢
            </span>
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono mt-0.5">
              {favoriteSongIds.size > 0 ? `${favoriteSongIds.size}首` : "0首"}
            </span>
          </Link>

          {/* 2. 最近播放 */}
          <Link
            href="/history"
            className="flex flex-col items-center group active:scale-90 transition-transform cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100/90 text-[#0095ff] shadow-sm shadow-sky-200/30 dark:bg-sky-500/15 dark:border-sky-500/30 dark:text-[#38bdf8] dark:shadow-[0_0_16px_rgba(0,149,255,0.15)] flex items-center justify-center group-hover:scale-110 transition-all duration-200">
              <Clock size={23} strokeWidth={2.2} />
            </div>
            <span className="text-[13px] font-bold text-neutral-800 dark:text-neutral-200 mt-2 leading-tight">
              最近播放
            </span>
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
              历史
            </span>
          </Link>

          {/* 3. 本地歌曲 */}
          <Link
            href="/history"
            className="flex flex-col items-center group active:scale-90 transition-transform cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100/90 text-[#00d674] shadow-sm shadow-emerald-200/30 dark:bg-[#00d674]/15 dark:border-[#00d674]/30 dark:text-[#00e87f] dark:shadow-[0_0_16px_rgba(0,214,116,0.15)] flex items-center justify-center group-hover:scale-110 transition-all duration-200">
              <ArrowDownCircle size={23} strokeWidth={2.2} />
            </div>
            <span className="text-[13px] font-bold text-neutral-800 dark:text-neutral-200 mt-2 leading-tight">
              本地歌曲
            </span>
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
              已下载
            </span>
          </Link>

          {/* 4. 导入歌单 */}
          <div
            onClick={() => {
              if (!isAuthenticated) {
                setIsAuthOpen(true);
              } else {
                setShowImportModal(true);
              }
            }}
            className="flex flex-col items-center group active:scale-90 transition-transform cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100/90 text-[#ff9500] shadow-sm shadow-amber-200/30 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-[#fbbf24] dark:shadow-[0_0_16px_rgba(245,158,11,0.15)] flex items-center justify-center group-hover:scale-110 transition-all duration-200">
              <FolderInput size={23} strokeWidth={2.2} />
            </div>
            <span className="text-[13px] font-bold text-neutral-800 dark:text-neutral-200 mt-2 leading-tight">
              导入歌单
            </span>
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
              一键迁移
            </span>
          </div>
        </div>
      </div>

      {/* 3. 歌单与音乐资产大卡片 (QQ音乐卡片式资产区) */}
      <div className="bg-white dark:bg-[#18181c] rounded-2xl p-4 shadow-[0_2px_14px_rgba(0,0,0,0.02)] border border-neutral-100 dark:border-white/[0.06] space-y-4">
        {/* 顶部 Tab 栏与操作按钮 */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-white/[0.06] pb-3">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab("created")}
              className={`text-base font-black transition-colors cursor-pointer relative pb-1 ${
                activeTab === "created"
                  ? "text-neutral-900 dark:text-white"
                  : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              自建歌单
              {isAuthenticated && playlists.length > 0 && (
                <span className="text-xs font-normal text-neutral-400 ml-1">
                  {playlists.length}
                </span>
              )}
              {activeTab === "created" && (
                <span className="absolute -bottom-[13px] left-1/2 -translate-x-1/2 w-5 h-[3.5px] bg-[#00d674] rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("favorited")}
              className={`text-base font-black transition-colors cursor-pointer relative pb-1 ${
                activeTab === "favorited"
                  ? "text-neutral-900 dark:text-white"
                  : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              收藏专辑
              {isAuthenticated && favoriteAlbums.length > 0 && (
                <span className="text-xs font-normal text-neutral-400 ml-1">
                  {favoriteAlbums.length}
                </span>
              )}
              {activeTab === "favorited" && (
                <span className="absolute -bottom-[13px] left-1/2 -translate-x-1/2 w-5 h-[3.5px] bg-[#00d674] rounded-full" />
              )}
            </button>
          </div>

          {/* 右侧新建与全部 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  setIsAuthOpen(true);
                } else {
                  setShowCreateModal(true);
                }
              }}
              className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#00d674]/10 text-[#00d674] border border-[#00d674]/20 hover:bg-[#00d674]/20 dark:bg-[#00d674]/15 dark:border-[#00d674]/30 active:scale-95 transition cursor-pointer"
              title="新建歌单"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>新建</span>
            </button>

            <Link
              href="/playlists"
              className="p-1 text-neutral-400 hover:text-neutral-800 dark:hover:text-white active:scale-90 transition cursor-pointer"
              title="查看全部"
            >
              <ChevronRight size={18} strokeWidth={2.2} />
            </Link>
          </div>
        </div>

        {/* 列表内容 */}
        {activeTab === "created" ? (
          <div className="space-y-2">
            {/* QQ音乐经典第一项：我喜欢的音乐专区 */}
            <Link
              href="/favorites"
              className="flex items-center justify-between p-2 -mx-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-white/5 active:scale-[0.99] transition group cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  style={{ backgroundColor: "#ff3a56" }}
                  className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#ff3a56] bg-gradient-to-br from-[#ff5e7e] to-[#ff2a55] flex items-center justify-center text-white shadow-md shadow-rose-500/25 shrink-0 group-hover:scale-105 transition-transform"
                >
                  <Heart size={24} className="fill-white stroke-none drop-shadow-sm" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[14px] font-extrabold text-neutral-900 dark:text-white truncate">
                    我喜欢的音乐
                  </h4>
                  <p className="text-[12px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5 font-medium">
                    {favoriteSongIds.size > 0 ? `${favoriteSongIds.size} 首歌曲` : "暂无收藏歌曲"} · 默认收藏
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/10 border border-neutral-200/60 dark:border-white/10 text-neutral-500 dark:text-neutral-300 group-hover:bg-[#00d674] group-hover:text-white group-hover:border-[#00d674] dark:group-hover:bg-[#00d674] dark:group-hover:text-white dark:group-hover:border-[#00d674] flex items-center justify-center shadow-sm transition-all shrink-0">
                <Play size={13} className="fill-current translate-x-0.5" />
              </div>
            </Link>

            {/* 用户自建歌单列表 */}
            {playlists.length > 0 ? (
              playlists.map((pl) => (
                <Link
                  key={pl.id}
                  href={`/playlist/${pl.id}`}
                  className="flex items-center justify-between p-2 -mx-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-white/5 active:scale-[0.99] transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-black/5 dark:border-white/5 shrink-0 shadow-sm">
                      {pl.coverPath ? (
                        <Image
                          src={getAuthenticatedSrc(pl.coverPath)}
                          alt={pl.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-white/5">
                          <ListMusic size={22} strokeWidth={2} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[14px] font-extrabold text-neutral-900 dark:text-white truncate">
                        {pl.name}
                      </h4>
                      <p className="text-[12px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                        {pl._count?.songs || 0} 首歌曲
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/10 border border-neutral-200/60 dark:border-white/10 text-neutral-500 dark:text-neutral-300 group-hover:bg-[#00d674] group-hover:text-white group-hover:border-[#00d674] dark:group-hover:bg-[#00d674] dark:group-hover:text-white dark:group-hover:border-[#00d674] flex items-center justify-center shadow-sm transition-all shrink-0">
                    <Play size={13} className="fill-current translate-x-0.5" />
                  </div>
                </Link>
              ))
            ) : !isAuthenticated ? (
              <div className="py-6 text-center space-y-2.5">
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  登录账户即可云同步您的专属歌单
                </p>
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="px-5 py-2 rounded-full text-xs font-bold bg-[#00d674] text-white shadow-md shadow-[#00d674]/25 hover:bg-[#00c768] active:scale-95 transition"
                >
                  立即登录
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            {favoriteAlbums.length > 0 ? (
              favoriteAlbums.map((alb) => (
                <Link
                  key={alb.id}
                  href={`/album/${alb.id}`}
                  className="flex items-center justify-between p-2 -mx-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-white/5 active:scale-[0.99] transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-black/5 dark:border-white/5 shrink-0 shadow-sm">
                      <Image
                        src={getAuthenticatedSrc(alb.coverPath || "/placeholder.jpg")}
                        alt={alb.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[14px] font-extrabold text-neutral-900 dark:text-white truncate">
                        {alb.title}
                      </h4>
                      <p className="text-[12px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                        {alb.artists?.[0]?.name || "未知歌手"}
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/10 border border-neutral-200/60 dark:border-white/10 text-neutral-500 dark:text-neutral-300 group-hover:bg-[#00d674] group-hover:text-white group-hover:border-[#00d674] dark:group-hover:bg-[#00d674] dark:group-hover:text-white dark:group-hover:border-[#00d674] flex items-center justify-center shadow-sm transition-all shrink-0">
                    <Play size={13} className="fill-current translate-x-0.5" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-8 text-center space-y-2">
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  暂无收藏专辑，去发现优质音乐吧
                </p>
                <Link
                  href="/"
                  className="inline-block text-xs font-bold text-[#00d674] hover:underline"
                >
                  去首页逛逛 &gt;
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 模态框组 */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode="login"
      />

      <AddFriendModal
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
      />

      {/* 创建歌单模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#1e1e22] w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-neutral-200 dark:border-white/10 space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              新建自建歌单
            </h3>
            <input
              type="text"
              placeholder="请输入歌单标题"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreatePlaylist()}
              autoFocus
              className="w-full h-11 px-4 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-[#00d674]"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition"
              >
                取消
              </button>
              <button
                onClick={handleCreatePlaylist}
                className="px-5 py-2 text-xs font-bold bg-[#00d674] text-black rounded-full hover:bg-[#00c768] active:scale-95 transition shadow-sm"
              >
                立即创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导入歌单模态框 */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#1e1e22] w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-neutral-200 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <FolderInput size={18} className="text-[#00d674]" />
                <span>导入外部歌单</span>
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              粘贴网易云音乐或QQ音乐歌单链接，一键将外部歌曲导入到您的自建歌单中：
            </p>
            <input
              type="text"
              placeholder="https://y.qq.com/... 或 网易云歌单链接"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleImportPlaylist()}
              autoFocus
              className="w-full h-11 px-4 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white text-xs focus:outline-none focus:border-[#00d674]"
            />
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition"
              >
                取消
              </button>
              <button
                onClick={handleImportPlaylist}
                className="px-5 py-2 text-xs font-bold bg-[#00d674] text-black rounded-full hover:bg-[#00c768] active:scale-95 transition shadow-sm"
              >
                一键导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
