"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Play,
  ArrowLeft,
  Clock,
  Calendar,
  AlertCircle,
  Heart,
  Info,
  Download,
  ListChecks,
  BarChart3,
  ChevronDown,
  Check,
} from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { useToastStore } from "@/store/useToastStore";
import { useUserStore } from "@/store/useUserStore";
import type { Song, Album, Artist } from "@/types";
import SongRowItem from "@/components/SongRowItem";
import SongDropdownMenu from "@/components/SongDropdownMenu";
import SongContextMenu from "@/components/SongContextMenu";
import MvPlayerModal from "@/components/MvPlayerModal";
import AlbumPageSkeleton from "@/components/AlbumPageSkeleton";
import { formatDuration, cleanSongTitle } from "@/lib/utils";
import { useColor } from "color-thief-react";
import { apiClient, getAuthenticatedSrc } from "@/lib/api-client";
import { motion } from "framer-motion";
import clsx from "clsx";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

type AlbumDetails = Album & {
  songs: Song[];
  artists: Artist[];
  duration?: number;
  releaseDate?: string;
  description?: string;
  regionalSongs?: {
    all?: Song[];
    chinese?: Song[];
    us?: Song[];
    korea?: Song[];
  };
};

const REGION_OPTIONS = [
  { id: "all", label: "全部" },
  { id: "chinese", label: "华语热门" },
  { id: "us", label: "美国公告榜" },
  { id: "korea", label: "韩国K-POP" },
] as const;

type RegionId = (typeof REGION_OPTIONS)[number]["id"];

const RegionDropdown = ({
  selectedRegion,
  onSelect,
  variant = "mobile",
}: {
  selectedRegion: RegionId;
  onSelect: (region: RegionId) => void;
  variant?: "mobile" | "desktop";
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentOption =
    REGION_OPTIONS.find((o) => o.id === selectedRegion) || REGION_OPTIONS[0];

  return (
    <div ref={ref} className="relative inline-block select-none z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-sm border",
          variant === "mobile"
            ? isOpen
              ? "bg-white text-neutral-950 border-white shadow-md px-3 py-1 font-bold"
              : "bg-white/90 hover:bg-white text-neutral-900 border-white/60 shadow-sm px-3 py-1 font-semibold"
            : isOpen
              ? "bg-neutral-200 dark:bg-white/20 text-neutral-900 dark:text-white border-neutral-300 dark:border-white/20 px-3.5 py-1.5 font-bold"
              : "bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/15 text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-white/10 px-3.5 py-1.5"
        )}
      >
        <span>{currentOption.label}</span>
        <ChevronDown
          size={13}
          className={clsx(
            "transition-transform duration-200 text-current",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          className={clsx(
            "absolute top-full mt-1.5 min-w-[130px] rounded-2xl backdrop-blur-xl shadow-[0_16px_36px_rgba(0,0,0,0.5)] p-1 z-[100] animate-in fade-in zoom-in-95 duration-150",
            variant === "mobile"
              ? "left-0 bg-neutral-900/98 border border-white/20 text-white"
              : "right-0 bg-white/95 dark:bg-neutral-900/95 border border-neutral-200 dark:border-white/15 text-neutral-900 dark:text-white shadow-xl"
          )}
        >
          {REGION_OPTIONS.map((opt) => {
            const isSelected = selectedRegion === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  onSelect(opt.id);
                  setIsOpen(false);
                }}
                className={clsx(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left",
                  isSelected
                    ? variant === "mobile"
                      ? "bg-white/15 text-white font-bold"
                      : "bg-[#1ed760]/15 text-[#1ed760] font-bold"
                    : variant === "mobile"
                      ? "text-neutral-300 hover:text-white hover:bg-white/10 font-medium"
                      : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10 font-medium"
                )}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <Check size={14} className="text-[#1ed760] shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AlbumDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { playSong, currentSong, isPlaying } = usePlayerStore();
  const { favoriteAlbumIds, toggleFavoriteAlbum, isSongFavorited, toggleFavoriteSong } =
    useFavoritesStore();
  const { addToast } = useToastStore();
  const { isAuthenticated } = useUserStore();

  const isFavorited = id ? favoriteAlbumIds.has(Number(id)) : false;

  const [album, setAlbum] = useState<AlbumDetails | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<"all" | "chinese" | "us" | "korea">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMvSong, setSelectedMvSong] = useState<Song | null>(null);

  const tParam = album?.title ? `&t=${encodeURIComponent(album.title)}` : "";
  const albumArtUrl = album?.coverPath
    ? getAuthenticatedSrc(album.coverPath, 400)
    : id
      ? `${API_BASE_URL}/api/covers/${id}?size=400&key=${API_KEY}${tParam}`
      : "/placeholder.jpg";

  const { data: dominantColor } = useColor(albumArtUrl, "hex", {
    crossOrigin: "anonymous",
    quality: 10,
  });

  useEffect(() => {
    if (!id) return;

    const fetchAlbumData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient<AlbumDetails>(`/api/albums/${id}`);
        setAlbum(data);
      } catch (err) {
        console.error("Error loading album:", err);
        setError(err instanceof Error ? err.message : "Failed to load album");
      } finally {
        setLoading(false);
      }
    };

    fetchAlbumData();
  }, [id]);

  const displayedSongs = useMemo(() => {
    if (!album) return [];
    if (selectedRegion === "chinese" && album.regionalSongs?.chinese) {
      return album.regionalSongs.chinese;
    }
    if (selectedRegion === "us" && album.regionalSongs?.us) {
      return album.regionalSongs.us;
    }
    if (selectedRegion === "korea" && album.regionalSongs?.korea) {
      return album.regionalSongs.korea;
    }
    return album.regionalSongs?.all || album.songs || [];
  }, [album, selectedRegion]);

  const isCompilation = useMemo(() => {
    if (!displayedSongs || displayedSongs.length === 0) return false;
    return displayedSongs.some(
      (s) => s.album && s.album.title && s.album.title !== album?.title
    );
  }, [album?.title, displayedSongs]);

  const queueWithAlbum = useMemo(() => {
    if (!displayedSongs) return [];
    return displayedSongs.map((song) => {
      if (
        song.album &&
        song.album.title &&
        (song.album.id !== album?.id || song.album.title !== album?.title)
      ) {
        return {
          ...song,
          album: {
            ...song.album,
            coverPath: song.album.coverPath || album?.coverPath,
            artists:
              song.album.artists && song.album.artists.length > 0
                ? song.album.artists
                : song.artist
                  ? [{ id: Math.abs(song.id), name: song.artist }]
                  : album?.artists || [],
          },
        };
      }

      return {
        ...song,
        album: song.album || {
          id: album?.id || 0,
          title: album?.title || "",
          artists: album?.artists || [],
          coverPath: album?.coverPath,
        },
      };
    });
  }, [album, displayedSongs]);

  const isAlbumPlaying = isPlaying && displayedSongs.some((s) => s.id === currentSong?.id);

  const chartTitle = useMemo(() => {
    if (!album?.title) return "巅峰榜";
    if (album.title.includes("飙升榜")) return "飙升榜";
    if (album.title.includes("热歌榜")) return "热歌榜";
    if (album.title.includes("新歌榜")) return "新歌榜";
    if (album.title.includes("公告")) return "公告牌榜";
    if (album.title.includes("韩国")) return "韩国榜";
    return album.title;
  }, [album?.title]);

  const updateDateStr = useMemo(() => {
    if (album?.releaseDate) {
      const d = new Date(album.releaseDate);
      if (!isNaN(d.getTime())) {
        return `${d.getMonth() + 1}月${d.getDate()}日`;
      }
    }
    const now = new Date();
    return `${now.getMonth() + 1}月${now.getDate()}日`;
  }, [album?.releaseDate]);

  const getFavCount = (song: Song) => {
    return song.favCount || "1k+";
  };

  const getSongTag = (song: Song) => {
    return song.tag || null;
  };

  const handlePlayAlbum = () => {
    if (queueWithAlbum.length > 0) {
      playSong(queueWithAlbum[0], queueWithAlbum);
    }
  };

  if (loading) return <AlbumPageSkeleton />;

  if (error || !album) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-neutral-400">
        <AlertCircle size={48} className="mb-4 text-red-500" />
        <h2 className="text-xl font-bold text-white mb-2">Album Not Found</h2>
        <p className="mb-6">{error || "The requested album does not exist."}</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-full text-white transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const totalDuration = displayedSongs.reduce(
    (acc, song) => acc + (song.duration || 0),
    0
  );

  return (
    <div className="relative isolate min-h-screen pb-32">
      {/* 桌面端专属动态氛围微光 */}
      <div
        className="hidden md:block absolute inset-x-0 top-0 h-[420px] -z-10 transition-colors duration-700 ease-in-out pointer-events-none"
        style={{
          background: `linear-gradient(180deg, ${dominantColor ? dominantColor + "33" : "rgba(30,215,96,0.18)"
            } 0%, ${dominantColor ? dominantColor + "0a" : "rgba(30,215,96,0.03)"
            } 70%, transparent 100%)`,
        }}
      />

      {/* ============================================================ */}
      <div className="md:hidden relative">
        {/* 1. 独立纯渐变绿色背景层与山峰水印 (底层 z-0，自然延伸至白色卡片下方) */}
        <div
          className="absolute inset-x-0 top-0 h-[260px] pointer-events-none z-0 overflow-hidden select-none"
          style={{
            background: "linear-gradient(180deg, #1fa55e 0%, #28b468 55%, #34c072 100%)",
          }}
        >
          <svg
            className="absolute left-6 top-10 w-52 h-44 opacity-20 pointer-events-none select-none"
            viewBox="0 0 160 120"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
          >
            <polygon points="80,10 20,110 140,110" />
            <polygon points="80,10 60,110 100,110" />
            <line x1="80" y1="10" x2="80" y2="110" />
            <line x1="45" y1="65" x2="115" y2="65" />
            <polygon points="120,35 85,110 155,110" />
          </svg>
        </div>

        {/* 2. 头部交互内容层 (高层 z-30，透明背景，其下拉菜单可无缝悬浮于白色卡片之上) */}
        <div className="relative z-30 pt-6 sm:pt-8 px-4 pb-7">
          {/* 沉浸式顶部返回键 */}
          <div className="relative z-10 flex items-center justify-between mb-3">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 -ml-1 rounded-full bg-black/20 hover:bg-black/30 active:scale-90 flex items-center justify-center text-white transition cursor-pointer"
              title="返回上一页"
            >
              <ArrowLeft size={18} />
            </button>
          </div>

          {/* 头部内容网格：左侧榜单信息，右侧唱片封面+探出黑胶 */}
          <div className="relative z-30 flex items-center justify-between gap-3 pt-1">
            <div className="flex flex-col justify-center min-w-0 pr-2">
              <div className="text-white/90 text-xs font-semibold tracking-wider mb-2 flex items-center gap-1.5">
                <span>巅峰榜</span>
                <span className="w-1 h-1 rounded-full bg-white/70" />
                <span>每日更新</span>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-sm truncate">
                  {chartTitle}
                </h1>
                <button
                  onClick={() =>
                    addToast("巅峰榜基于海量收听行为综合计算生成，每日更新")
                  }
                  className="text-white/80 hover:text-white p-1 -m-1 transition-colors"
                  title="榜单规则说明"
                >
                  <Info size={16} />
                </button>
              </div>

              <div className="text-white/80 text-[11px] font-medium tracking-wide">
                最近更新 {updateDateStr}
              </div>

              {/* 主流精简下拉筛选框: [ 华语 ▾ ] */}
              {(album.regionalSongs || id === "3778678") && (
                <div className="pt-2">
                  <RegionDropdown
                    selectedRegion={selectedRegion}
                    onSelect={setSelectedRegion}
                    variant="mobile"
                  />
                </div>
              )}
            </div>

            {/* 右侧：圆角封面与半露出拟真黑胶唱片 */}
            <div className="relative shrink-0 flex items-center pr-3">
              {/* 半露出黑胶唱片 */}
              <div
                className={clsx(
                  "absolute -right-3.5 sm:-right-4 top-0 z-0 w-28 h-28 sm:w-32 sm:h-32 rounded-full shadow-2xl flex items-center justify-center border border-neutral-800/80 transition-transform duration-500 select-none",
                  isAlbumPlaying && "animate-spin [animation-duration:8s]"
                )}
                style={{
                  background:
                    "radial-gradient(circle, #1a1a1c 0%, #121214 38%, #0d0d0f 70%, #08080a 100%)",
                  boxShadow:
                    "0 8px 24px rgba(0,0,0,0.5), inset 0 0 10px rgba(255,255,255,0.06)",
                }}
              >
                {/* 黑胶微同心圆凹槽纹理 */}
                <div className="absolute inset-1.5 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute inset-3 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute inset-4.5 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute inset-6 rounded-full border border-white/5 pointer-events-none" />

                {/* 黑胶中心金色/橘红复古标签 */}
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 border border-amber-500/40 shadow-inner flex items-center justify-center relative z-10">
                  <div className="w-2 h-2 rounded-full bg-black border border-white/30" />
                </div>
              </div>

              {/* 正面圆角唱片封面 */}
              <motion.div
                layoutId={`album-cover-mobile-${id}`}
                className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shadow-2xl border border-white/20 flex-shrink-0 bg-neutral-900"
              >
                <Image
                  src={albumArtUrl}
                  alt={album.title}
                  fill
                  className="object-cover"
                  priority
                  unoptimized
                  sizes="130px"
                />
              </motion.div>
            </div>
          </div>
        </div>

        {/* 2. 榜单主内容白/黑圆角卡片 */}
        <div className="relative z-10 -mt-5 rounded-t-3xl bg-white dark:bg-[#121212] pt-3 pb-6 shadow-[0_-6px_20px_rgba(0,0,0,0.08)]">
          {/* 全部播放控制行 */}
          <div className="flex items-center justify-between px-4 pt-1 pb-2 select-none">
            <div
              onClick={handlePlayAlbum}
              className="flex items-center gap-3 cursor-pointer group active:opacity-80 transition"
            >
              <div className="w-10 h-10 rounded-full bg-[#1ed760] hover:bg-[#1fdf64] active:scale-95 transition flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                <Play
                  size={18}
                  className="fill-black text-black translate-x-0.5"
                />
              </div>
              <span className="text-[17px] font-black text-neutral-900 dark:text-white tracking-tight">
                全部播放({displayedSongs.length})
              </span>
            </div>

            <div className="flex items-center gap-2 text-neutral-400 dark:text-neutral-400">
              <button
                onClick={() => addToast("已加入离线缓存队列")}
                className="p-1.5 hover:text-neutral-900 dark:hover:text-white active:scale-90 transition cursor-pointer"
                title="下载全部"
              >
                <Download size={20} />
              </button>
              <button
                onClick={() => addToast("多选管理功能已就绪")}
                className="p-1.5 hover:text-neutral-900 dark:hover:text-white active:scale-90 transition cursor-pointer"
                title="批量操作"
              >
                <ListChecks size={21} />
              </button>
            </div>
          </div>

          {/* 2.3 移动端榜单歌曲行列表 */}
          <div className="flex flex-col gap-0.5 px-1 mt-1">
            {queueWithAlbum.map((song, index) => {
              const isCurrent = song.id === currentSong?.id;
              const isFavorited = isSongFavorited(song.id);
              const cover = song.album?.coverPath
                ? getAuthenticatedSrc(song.album.coverPath, 100)
                : albumArtUrl;

              const tagText = getSongTag(song);
              const favCount = getFavCount(song);

              return (
                <SongContextMenu key={song.id} song={song}>
                  <div
                    onClick={() => playSong(song, queueWithAlbum)}
                    className={clsx(
                      "group flex items-center justify-between px-2.5 py-2 hover:bg-neutral-100/70 dark:hover:bg-white/5 active:bg-neutral-200/60 dark:active:bg-white/10 rounded-xl transition cursor-pointer select-none",
                      isCurrent && "bg-emerald-500/10 dark:bg-emerald-500/10"
                    )}
                  >
                    {/* 排名与真实涨跌趋势 */}
                    <div className="w-8 shrink-0 flex flex-col items-center justify-center mr-1 select-none">
                      <span
                        className={clsx(
                          "leading-none tracking-tighter tabular-nums",
                          index < 3
                            ? "text-[22px] font-black italic text-[#f04142]"
                            : "text-base font-bold text-neutral-600 dark:text-neutral-400"
                        )}
                      >
                        {index + 1}
                      </span>
                      {song.trend ? (
                        <span
                          className={clsx(
                            "text-[9px] font-bold flex items-center leading-none mt-0.5 tabular-nums",
                            song.trend.type === "up" && "text-[#f04142]",
                            song.trend.type === "down" && "text-sky-500 dark:text-sky-400",
                            song.trend.type === "same" && "text-neutral-400 dark:text-neutral-500 font-semibold",
                            song.trend.type === "new" && "text-amber-500 font-black text-[8px]"
                          )}
                        >
                          {song.trend.text}
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold text-neutral-400 dark:text-neutral-500 leading-none mt-0.5">
                          -
                        </span>
                      )}
                    </div>

                    {/* 封面图片 */}
                    <div className="relative w-11 h-11 min-w-[44px] rounded-lg overflow-hidden shrink-0 shadow-sm border border-black/5 dark:border-white/5 bg-neutral-100 dark:bg-neutral-800 mr-2.5">
                      <Image
                        src={cover}
                        alt={song.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      {isCurrent && isPlaying && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <BarChart3
                            size={16}
                            className="text-[#1ed760] animate-pulse"
                          />
                        </div>
                      )}
                    </div>

                    {/* 歌名与亮点标签 (中间弹性自适应区域) */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5 mr-1.5">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span
                          className={clsx(
                            "font-bold text-[15px] truncate",
                            isCurrent
                              ? "text-[#1ed760]"
                              : "text-neutral-900 dark:text-white"
                          )}
                        >
                          {cleanSongTitle(song.title, song.artist)}
                        </span>
                        {tagText && (
                          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0 truncate max-w-[110px] sm:max-w-[140px]">
                            {tagText}
                          </span>
                        )}
                      </div>

                      {/* 歌手专辑信息 */}
                      <div className="flex items-center gap-1 overflow-hidden text-xs text-neutral-500 dark:text-neutral-400">
                        <span className="truncate">
                          {song.artist || "未知歌手"}
                          {song.album?.title ? ` · ${song.album.title}` : ""}
                        </span>
                      </div>
                    </div>

                    {/* 右侧操作按钮组 (收藏量列与更多菜单固定位置与宽度，自适应所有设备屏幕) */}
                    <div
                      className="flex items-center shrink-0 ml-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* 收藏按钮与收藏量：固定 w-14 (56px) 且靠左对齐，确保图标与数字竖向绝对成列，杜绝因位数不同产生位移 */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!isAuthenticated) {
                            addToast("请先登录");
                            return;
                          }
                          await toggleFavoriteSong(song.id);
                          addToast(isFavorited ? "已取消收藏" : "已添加到收藏");
                        }}
                        className="w-14 flex items-center justify-start gap-1 py-1 pl-1 pr-0.5 active:scale-90 transition cursor-pointer"
                        title={isFavorited ? "取消收藏" : "收藏歌曲"}
                      >
                        <Heart
                          size={14}
                          className={clsx(
                            "transition-colors shrink-0",
                            isFavorited
                              ? "fill-rose-500 text-rose-500"
                              : "text-neutral-400 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                          )}
                        />
                        <span className="text-[11px] text-neutral-400 dark:text-neutral-400 font-medium tabular-nums truncate">
                          {favCount}
                        </span>
                      </button>

                      {/* 更多菜单 (竖直三点)：固定 w-7 (28px) 居中对齐 */}
                      <div className="w-7 flex items-center justify-center shrink-0">
                        <SongDropdownMenu
                          song={song}
                          icon="vertical"
                          buttonClassName="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-full transition active:scale-90"
                        />
                      </div>
                    </div>
                  </div>
                </SongContextMenu>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 桌面端经典视图 (hidden md:block) */}
      {/* ============================================================ */}
      <div className="hidden md:block px-3 sm:px-6 md:px-8 pt-2 sm:pt-6 md:pt-8">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-4 sm:gap-6 md:gap-8 mb-6 md:mb-8 text-center md:text-left">
          <motion.div
            layoutId={`album-cover-${id}`}
            className="relative w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 shadow-2xl flex-shrink-0 rounded-2xl md:rounded-xl overflow-hidden border border-black/5 dark:border-white/10"
            transition={{ duration: 0.3 }}
          >
            <Image
              src={albumArtUrl}
              alt={album.title}
              fill
              className="object-cover"
              priority
              unoptimized
              sizes="300px"
            />
          </motion.div>

          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-2.5 py-0.5 rounded-full">
                {isCompilation ? "官方榜单精选" : "专辑"}
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight">
              {album.title}
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs md:text-sm text-neutral-600 dark:text-neutral-300 font-medium mt-1">
              <div className="flex items-center gap-1">
                {album.artists.map((artist, i) => (
                  <span
                    key={artist.id}
                    className="text-neutral-900 dark:text-white hover:underline cursor-pointer font-bold"
                  >
                    {artist.name}
                    {i < album.artists.length - 1 && ", "}
                  </span>
                ))}
              </div>
              <span className="text-neutral-300 dark:text-neutral-600">•</span>
              <span>{displayedSongs.length} 首歌曲</span>
              <span className="text-neutral-300 dark:text-neutral-600">•</span>
              <span className="flex items-center gap-1">
                <Clock size={13} />
                约 {Math.round(totalDuration / 60)} 分钟
              </span>
              {album.releaseDate && (
                <>
                  <span className="text-neutral-300 dark:text-neutral-600">•</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={13} />
                    {new Date(album.releaseDate).getFullYear()}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 桌面端快捷操作栏与筛选框 */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 md:mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayAlbum}
              className="flex items-center gap-2 px-5 py-2.5 md:w-14 md:h-14 md:p-0 md:justify-center bg-[#1ed760] hover:bg-[#1fdf64] rounded-full shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all text-neutral-950 font-bold text-sm cursor-pointer"
              title="播放全部"
            >
              <Play
                size={26}
                fill="currentColor"
                className="translate-x-0.5"
              />
            </button>

            <button
              onClick={() => id && toggleFavoriteAlbum(Number(id))}
              className="p-2.5 rounded-full border border-neutral-200/80 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer text-neutral-600 dark:text-neutral-300 hover:text-rose-500 dark:hover:text-rose-400"
              aria-label={isFavorited ? "取消收藏" : "收藏专辑"}
              title={isFavorited ? "已收藏" : "收藏"}
            >
              <Heart
                size={22}
                className={`transition-colors ${isFavorited ? "fill-rose-500 text-rose-500" : "currentColor"
                  }`}
              />
            </button>
          </div>

          {(album.regionalSongs || id === "3778678") && (
            <div className="ml-auto md:ml-4">
              <RegionDropdown
                selectedRegion={selectedRegion}
                onSelect={setSelectedRegion}
                variant="desktop"
              />
            </div>
          )}
        </div>

        {/* 桌面端表头 */}
        <div className="grid grid-cols-[28px_4fr_2fr_minmax(60px,auto)] gap-4 px-4 py-2.5 border-b border-neutral-200/80 dark:border-white/10 text-neutral-400 dark:text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-2 sticky top-14 md:top-16 bg-white/90 dark:bg-[#121212]/90 backdrop-blur-md z-10">
          <div className="text-right pr-2">#</div>
          <div>歌曲标题</div>
          <div>专辑</div>
          <div className="flex justify-end pr-2">
            <Clock size={15} />
          </div>
        </div>

        {/* 桌面端歌曲列表 */}
        <div className="flex flex-col gap-0.5">
          {queueWithAlbum.map((songWithAlbum, index) => (
            <SongRowItem
              key={songWithAlbum.id}
              song={songWithAlbum}
              index={index}
              queue={queueWithAlbum}
              hideCover={!isCompilation}
            />
          ))}
        </div>
      </div>

      {/* MV 播放模态窗口 */}
      <MvPlayerModal
        isOpen={!!selectedMvSong}
        onClose={() => setSelectedMvSong(null)}
        songTitle={cleanSongTitle(
          selectedMvSong?.title || "",
          selectedMvSong?.artist
        )}
        artistName={selectedMvSong?.artist}
        duration={selectedMvSong?.duration}
      />
    </div>
  );
};

export default AlbumDetailPage;
