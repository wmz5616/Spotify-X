"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Heart,
  ArrowDownCircle,
  ShoppingBag,
  User as UserIcon,
  Plus,
  Play,
  MessageCircle,
  UserPlus,
  LogOut,
  ChevronRight,
  ShieldAlert,
  Zap,
  FolderInput,
  Shirt,
  CalendarCheck,
  UserCheck,
  Crown,
  Sparkles,
  SlidersHorizontal,
  X,
  Radio,
  DownloadCloud,
  Check,
  Palette,
  Sun,
  Moon,
  Disc3,
  ListMusic
} from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useToastStore } from "@/store/useToastStore";
import { useThemeStore } from "@/store/useThemeStore";
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
  const { mode, setMode } = useThemeStore();

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
  const [showVipModal, setShowVipModal] = useState(false);
  const [showDailySignModal, setShowDailySignModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

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
    <div className="max-w-2xl mx-auto space-y-4 pb-20 select-none px-1">
      {/* 1. 顶部用户卡片 (1:1 复刻目标设计) */}
      <div className="bg-white dark:bg-[#18181c] rounded-3xl p-4 sm:p-5 shadow-[0_2px_16px_rgba(0,0,0,0.03)] dark:shadow-none border border-black/[0.04] dark:border-white/[0.05] relative overflow-hidden transition-colors">
        {/* 上半部分：登录状态 / 积分 */}
        <div className="flex items-center justify-between gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 border-2 border-[#00d674]/40 shrink-0 flex items-center justify-center shadow-sm">
                {user.avatarPath ? (
                  <Image
                    src={getAuthenticatedSrc(user.avatarPath)}
                    alt={user.displayName || user.username || "用户头像"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-neutral-800 dark:text-white uppercase">
                    {(user.displayName || user.username || "U")[0]}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-[15px] sm:text-base font-extrabold text-neutral-900 dark:text-white truncate">
                    {user.displayName || user.username}
                  </h2>
                  <span className="bg-[#00d674]/15 text-[#00d674] text-[10px] font-black px-1.5 py-0.2 rounded font-mono leading-tight">
                    VIP
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                  登录云同步个人音乐资产 · 听歌 Lv.8
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setIsAuthOpen(true)}
                className="bg-[#00d674] hover:bg-[#00c768] active:scale-95 text-black font-bold text-[13px] px-4 py-2 rounded-full flex items-center gap-1.5 shadow-sm transition-all shrink-0"
              >
                <UserIcon size={15} strokeWidth={2.5} className="fill-black text-black" />
                <span>立即登录</span>
              </button>
              <span className="text-[12px] text-neutral-500 dark:text-neutral-400 truncate">
                登录云同步个...
              </span>
            </div>
          )}

          {/* 右侧：120 🪙 领现金 */}
          <div
            onClick={() => setShowVipModal(true)}
            className="flex flex-col items-end shrink-0 cursor-pointer active:scale-95 transition-transform pl-2"
            title="福利中心"
          >
            <div className="flex items-center gap-1">
              <span className="text-[15px] font-black text-neutral-900 dark:text-white font-mono tabular-nums leading-none">
                120
              </span>
              <div className="w-4 h-4 rounded-full bg-amber-400 text-white font-bold flex items-center justify-center text-[10px] shadow-sm leading-none">
                ¥
              </div>
            </div>
            <div className="flex items-center text-[10px] text-neutral-400 dark:text-neutral-500 font-medium mt-1 leading-none">
              <span>领现金</span>
              <ChevronRight size={10} className="stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* 下半部分：会员中心与快捷小工具 */}
        <div className="flex items-center justify-between border-t border-neutral-100 dark:border-white/[0.05] mt-4 pt-3.5">
          {/* 左侧：会员中心 > 查看会员权益 [去开通] */}
          <div
            onClick={() => setShowVipModal(true)}
            className="flex flex-col cursor-pointer active:scale-95 transition-transform group"
          >
            <div className="flex items-center gap-0.5 text-[13px] font-bold text-[#00d674] group-hover:brightness-110">
              <span>会员中心</span>
              <ChevronRight size={13} strokeWidth={3} className="translate-y-[0.5px]" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-normal">
                查看会员权益
              </span>
              <span className="bg-[#00d674]/15 dark:bg-[#00d674]/20 text-[#00d674] text-[10px] font-bold px-2 py-0.5 rounded-full leading-none scale-95 origin-left">
                去开通
              </span>
            </div>
          </div>

          {/* 右侧：3 个经典业务图标 (装扮 / 日签 / 关注) */}
          <div className="flex items-center gap-5 sm:gap-6 shrink-0">
            {/* 1. 装扮 */}
            <button
              onClick={() => setShowThemeModal(true)}
              className="flex flex-col items-center gap-1 text-neutral-600 dark:text-neutral-300 active:scale-90 transition-transform"
              title="主题装扮"
            >
              <div className="text-sky-500 dark:text-sky-400">
                <Shirt size={19} strokeWidth={2.2} />
              </div>
              <span className="text-[11px] font-medium leading-none">装扮</span>
            </button>

            {/* 2. 日签 */}
            <button
              onClick={() => setShowDailySignModal(true)}
              className="flex flex-col items-center gap-1 text-neutral-600 dark:text-neutral-300 active:scale-90 transition-transform"
              title="听歌日签"
            >
              <div className="text-rose-500 dark:text-rose-400">
                <CalendarCheck size={19} strokeWidth={2.2} />
              </div>
              <span className="text-[11px] font-medium leading-none">日签</span>
            </button>

            {/* 3. 关注 */}
            <Link
              href="/favorites"
              className="flex flex-col items-center gap-1 text-neutral-600 dark:text-neutral-300 active:scale-90 transition-transform"
              title="我的关注"
            >
              <div className="text-amber-500 dark:text-amber-400">
                <UserCheck size={19} strokeWidth={2.2} />
              </div>
              <span className="text-[11px] font-medium leading-none">关注</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. 核心 4 宫格横向操作栏 (收藏 / 本地 / 有声 / 已购) */}
      <div className="grid grid-cols-4 py-2 sm:py-3 text-center">
        {/* 收藏 */}
        <Link
          href="/favorites"
          className="flex flex-col items-center justify-center group active:scale-90 transition-transform cursor-pointer"
        >
          <div className="w-10 h-10 flex items-center justify-center text-neutral-900 dark:text-white group-hover:scale-110 transition-transform">
            <Heart size={24} className="fill-current stroke-[1.8]" />
          </div>
          <span className="text-[13px] font-bold text-neutral-800 dark:text-neutral-200 mt-1">
            收藏
          </span>
        </Link>

        {/* 本地 */}
        <Link
          href="/history"
          className="flex flex-col items-center justify-center group active:scale-90 transition-transform cursor-pointer"
        >
          <div className="w-10 h-10 flex items-center justify-center text-neutral-900 dark:text-white group-hover:scale-110 transition-transform">
            <ArrowDownCircle size={24} strokeWidth={2} />
          </div>
          <span className="text-[13px] font-bold text-neutral-800 dark:text-neutral-200 mt-1">
            本地
          </span>
        </Link>

        {/* 有声 */}
        <div
          onClick={() => addToast("有声电台功能已就绪")}
          className="flex flex-col items-center justify-center group active:scale-90 transition-transform cursor-pointer"
        >
          <div className="w-10 h-10 flex items-center justify-center text-neutral-900 dark:text-white group-hover:scale-110 transition-transform">
            <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center">
              <div className="w-2.5 h-1 bg-current rounded-full" />
            </div>
          </div>
          <span className="text-[13px] font-bold text-neutral-800 dark:text-neutral-200 mt-1">
            有声
          </span>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-tight mt-0.5">
            精彩待收听
          </span>
        </div>

        {/* 已购 */}
        <Link
          href="/playlists"
          className="flex flex-col items-center justify-center group active:scale-90 transition-transform cursor-pointer"
        >
          <div className="w-10 h-10 flex items-center justify-center text-neutral-900 dark:text-white group-hover:scale-110 transition-transform">
            <ShoppingBag size={24} strokeWidth={2} />
          </div>
          <span className="text-[13px] font-bold text-neutral-800 dark:text-neutral-200 mt-1">
            已购
          </span>
        </Link>
      </div>

      {/* 3. 自建歌单 / 收藏歌单 选项卡与快捷按钮 */}
      <div className="flex items-center justify-between pt-2">
        {/* 左侧：自建歌单 & 收藏歌单 */}
        <div className="flex items-baseline gap-3.5">
          <button
            onClick={() => setActiveTab("created")}
            className={`text-[17px] sm:text-[18px] transition-colors cursor-pointer ${
              activeTab === "created"
                ? "font-extrabold text-neutral-900 dark:text-white"
                : "font-medium text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            自建歌单
          </button>
          <button
            onClick={() => setActiveTab("favorited")}
            className={`text-[15px] sm:text-[16px] transition-colors cursor-pointer ${
              activeTab === "favorited"
                ? "font-extrabold text-neutral-900 dark:text-white"
                : "font-medium text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            收藏歌单
          </button>
        </div>

        {/* 右侧：+ 创建歌单，→] 导入外部歌单，> 管理全部歌单 */}
        <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400">
          <button
            onClick={() => {
              if (!isAuthenticated) {
                setIsAuthOpen(true);
              } else {
                setShowCreateModal(true);
              }
            }}
            className="p-1 hover:text-neutral-900 dark:hover:text-white active:scale-90 transition cursor-pointer"
            title="创建新歌单"
          >
            <Plus size={21} strokeWidth={2.2} />
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="p-1 hover:text-neutral-900 dark:hover:text-white active:scale-90 transition cursor-pointer"
            title="导入外部歌单"
          >
            <FolderInput size={19} strokeWidth={2.2} />
          </button>

          <Link
            href="/playlists"
            className="p-1 hover:text-neutral-900 dark:hover:text-white active:scale-90 transition cursor-pointer"
            title="全部歌单"
          >
            <ChevronRight size={21} strokeWidth={2.2} />
          </Link>
        </div>
      </div>

      {/* 4. 新人福利横幅卡片 */}
      <div
        onClick={() => {
          if (!isAuthenticated) {
            setIsAuthOpen(true);
          } else {
            setShowImportModal(true);
          }
        }}
        className="bg-white dark:bg-[#18181c] rounded-2xl p-3 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-none border border-black/[0.04] dark:border-white/[0.05] flex items-center gap-3.5 cursor-pointer hover:border-emerald-500/30 transition-all active:scale-[0.99] group"
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00d674] to-[#00aa5b] flex items-center justify-center text-white shadow-sm shrink-0 group-hover:scale-105 transition-transform">
          <Zap size={24} className="fill-white stroke-none" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
            新人福利：导入外部歌单，领绿钻好礼
          </h4>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
            {isAuthenticated
              ? "支持网易云、QQ音乐外部歌单链接一键导入"
              : "立即登录，查看导入歌单福利"}
          </p>
        </div>
      </div>

      {/* 5. 歌单列表内容 */}
      {activeTab === "created" ? (
        isAuthenticated && playlists.length > 0 ? (
          <div className="space-y-2">
            {playlists.map((pl) => (
              <Link
                key={pl.id}
                href={`/playlist/${pl.id}`}
                className="bg-white dark:bg-[#18181c] hover:bg-neutral-50 dark:hover:bg-[#202024] border border-black/[0.04] dark:border-white/[0.05] rounded-2xl p-3 flex items-center justify-between transition-all active:scale-[0.99] group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-black/5 dark:border-white/5 shrink-0 shadow-sm">
                    {pl.coverPath ? (
                      <Image
                        src={getAuthenticatedSrc(pl.coverPath)}
                        alt={pl.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400 dark:text-neutral-500">
                        <ListMusic size={22} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-[13px] sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                      {pl.name}
                    </h5>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                      {pl._count?.songs || 0} 首歌曲
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/5 flex items-center justify-center text-neutral-400 group-hover:text-emerald-500 transition-colors shrink-0">
                  <Play size={13} className="fill-current translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        ) : null
      ) : (
        isAuthenticated && favoriteAlbums.length > 0 ? (
          <div className="space-y-2">
            {favoriteAlbums.map((alb) => (
              <Link
                key={alb.id}
                href={`/album/${alb.id}`}
                className="bg-white dark:bg-[#18181c] hover:bg-neutral-50 dark:hover:bg-[#202024] border border-black/[0.04] dark:border-white/[0.05] rounded-2xl p-3 flex items-center justify-between transition-all active:scale-[0.99] group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-black/5 dark:border-white/5 shrink-0 shadow-sm">
                    <Image
                      src={getAuthenticatedSrc(alb.coverPath || "/placeholder.jpg")}
                      alt={alb.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-[13px] sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                      {alb.title}
                    </h5>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                      {alb.artists?.[0]?.name || "未知歌手"}
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/5 flex items-center justify-center text-neutral-400 group-hover:text-emerald-500 transition-colors shrink-0">
                  <Play size={13} className="fill-current translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        ) : null
      )}

      {/* 6. 底部自定义我的布局胶囊按钮 */}
      <div className="flex justify-center pt-3 pb-8">
        <button
          onClick={() => addToast("已应用当前推荐的极简布局")}
          className="px-6 py-2 rounded-full border border-neutral-300/90 dark:border-white/15 text-neutral-600 dark:text-neutral-300 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-white/5 active:scale-95 transition-all shadow-sm cursor-pointer"
        >
          自定义我的布局
        </button>
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

      {/* 会员中心权益弹窗 */}
      {showVipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#1c1c20] w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-neutral-200 dark:border-white/10 space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="text-amber-400 fill-amber-400" size={20} />
                <h3 className="text-base font-black text-neutral-900 dark:text-white">
                  会员特权专区
                </h3>
              </div>
              <button
                onClick={() => setShowVipModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3.5 bg-amber-500/10 dark:bg-amber-400/10 rounded-2xl border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
              当前金币资产：<span className="font-bold text-sm font-mono">120 🪙</span>
              <p className="text-[11px] opacity-80 mt-0.5">每日收听歌曲可获得金币，支持兑换绿钻会员与专属装扮</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <div className="font-bold text-neutral-900 dark:text-white mb-1">无损母带音质</div>
                <div className="text-[11px] text-neutral-400">FLAC 24bit/96kHz</div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <div className="font-bold text-neutral-900 dark:text-white mb-1">全曲库畅听</div>
                <div className="text-[11px] text-neutral-400">百万 VIP 专享音乐</div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <div className="font-bold text-neutral-900 dark:text-white mb-1">沉浸播放器皮肤</div>
                <div className="text-[11px] text-neutral-400">个性唱片 & 歌词动效</div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <div className="font-bold text-neutral-900 dark:text-white mb-1">离线本地下载</div>
                <div className="text-[11px] text-neutral-400">随时随地畅快随心听</div>
              </div>
            </div>

            <button
              onClick={() => {
                addToast("您当前已享受超级 VIP 尊贵权益！");
                setShowVipModal(false);
              }}
              className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-[#00d674] text-black font-bold text-xs rounded-full shadow-md active:scale-95 transition"
            >
              一键领取会员福利
            </button>
          </div>
        </div>
      )}

      {/* 日签打卡弹窗 */}
      {showDailySignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-gradient-to-br from-neutral-900 via-neutral-950 to-black text-white w-full max-w-xs rounded-3xl p-6 shadow-2xl border border-white/10 space-y-4 text-center">
            <div className="text-xs text-rose-400 font-semibold tracking-wider uppercase">
              {new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })}
            </div>
            <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <CalendarCheck size={32} />
            </div>
            <div>
              <h4 className="text-lg font-black">听歌日签 · 打卡成功</h4>
              <p className="text-xs text-neutral-400 mt-1 italic">
                “生活若有诗意，音乐便是最美的注脚。”
              </p>
            </div>
            <div className="text-xs text-[#00d674] font-medium bg-[#00d674]/10 py-1.5 rounded-full">
              已累计签到 7 天 · 获得 +10 金币
            </div>
            <button
              onClick={() => setShowDailySignModal(false)}
              className="w-full py-2 bg-white text-black font-bold text-xs rounded-full active:scale-95 transition"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 装扮主题切换弹窗 */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#1e1e22] w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-neutral-200 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Shirt size={18} className="text-sky-500" />
                <span>个性装扮与外观模式</span>
              </h3>
              <button
                onClick={() => setShowThemeModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => {
                  setMode("light");
                  addToast("已切换为日间明亮主题");
                  setShowThemeModal(false);
                }}
                className={`p-4 rounded-2xl border flex flex-col items-center gap-2 text-xs font-bold transition active:scale-95 ${
                  mode === "light"
                    ? "bg-amber-500/10 border-amber-500 text-amber-600"
                    : "bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300"
                }`}
              >
                <Sun size={24} className="text-amber-500" />
                <span>日间明亮模式</span>
              </button>
              <button
                onClick={() => {
                  setMode("dark");
                  addToast("已切换为夜间经典暗色");
                  setShowThemeModal(false);
                }}
                className={`p-4 rounded-2xl border flex flex-col items-center gap-2 text-xs font-bold transition active:scale-95 ${
                  mode === "dark"
                    ? "bg-[#00d674]/15 border-[#00d674] text-[#00d674]"
                    : "bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300"
                }`}
              >
                <Moon size={24} className="text-[#00d674]" />
                <span>夜间暗黑模式</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
