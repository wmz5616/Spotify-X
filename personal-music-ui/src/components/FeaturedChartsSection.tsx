"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Pause, ChevronRight, Heart } from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { getAuthenticatedSrc } from "@/lib/api-client";
import { formatDuration, cleanSongTitle } from "@/lib/utils";
import type { Song } from "@/types";

type ChartAlbum = {
  id: number;
  title: string;
  coverPath?: string | null;
  artists?: { id: number; name: string }[];
  songs?: Song[];
};

interface FeaturedChartsSectionProps {
  hotChart?: ChartAlbum | null;
  soarChart?: ChartAlbum | null;
  billboardChart?: ChartAlbum | null;
  koreaChart?: ChartAlbum | null;
}

type ChartType = "hot" | "soar" | "billboard" | "korea";

const ChartCard = ({
  chart,
  type,
}: {
  chart: ChartAlbum;
  type: ChartType;
}) => {
  const { currentSong, isPlaying, playSong, togglePlayPause } = usePlayerStore();

  const isCurrentChart = currentSong?.album?.id === chart.id;
  const isChartPlaying = isCurrentChart && isPlaying;

  const topSongs = (chart.songs || []).slice(0, 4);

  const themeConfig = {
    hot: {
      tag: "热歌榜",
      desc: "全网收听千万级金曲",
    },
    soar: {
      tag: "飙升榜",
      desc: "近期势头最猛流行力作",
    },
    billboard: {
      tag: "公告牌",
      desc: "全球流行权威风向标",
    },
    korea: {
      tag: "韩国榜",
      desc: "K-POP 潮流",
    },
  }[type];

  // Format chart songs queue with album metadata for full album playback, preserving original song albums
  const formattedQueue = (chart.songs || []).map((s) => ({
    ...s,
    album:
      s.album && s.album.title && s.album.title !== chart.title
        ? {
          ...s.album,
          artists:
            s.album.artists && s.album.artists.length > 0
              ? s.album.artists
              : s.artist
                ? [{ id: Math.abs(s.id), name: s.artist }]
                : chart.artists || [],
        }
        : {
          id: chart.id,
          title: chart.title,
          artists: chart.artists || [],
          coverPath: chart.coverPath,
        },
  }));

  const handlePlayChart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isCurrentChart) {
      togglePlayPause();
      return;
    }

    if (formattedQueue.length > 0) {
      playSong(formattedQueue[0], formattedQueue);
    }
  };

  const handlePlayTrack = (track: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (currentSong?.id === track.id) {
      togglePlayPause();
      return;
    }

    const targetSong =
      formattedQueue.find((s) => s.id === track.id) || {
        ...track,
        album: {
          id: chart.id,
          title: chart.title,
          artists: chart.artists || [],
          coverPath: chart.coverPath,
        },
      };

    playSong(targetSong, formattedQueue);
  };

  const coverUrl = chart.coverPath
    ? getAuthenticatedSrc(chart.coverPath, 300)
    : getAuthenticatedSrc(`api/covers/${chart.id}?size=300`);

  return (
    <div className="group relative rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200/80 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/[0.14] transition-all duration-300 select-none p-4 sm:p-6 shadow-sm hover:shadow-md">
      {/* Top Header Badge & Link */}
      <div className="flex items-center justify-between pb-3 mb-3 sm:pb-3.5 sm:mb-4 border-b border-neutral-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-white/[0.06] text-neutral-800 dark:text-neutral-200 border border-black/5 dark:border-white/[0.08]">
            {themeConfig.tag}
          </span>
          <span className="text-xs text-neutral-400 hidden sm:inline-block">
            {themeConfig.desc}
          </span>
        </div>

        <Link
          href={`/album/${chart.id}`}
          className="text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white flex items-center gap-1 transition-colors group/link font-medium"
        >
          <span>全部 {chart.songs?.length || 50} 首</span>
          <ChevronRight
            size={14}
            className="group-hover/link:translate-x-0.5 transition-transform"
          />
        </Link>
      </div>

      {/* 移动端顶部紧凑榜单展示行 (封面 + 标题 + 播放按钮) */}
      <div className="flex sm:hidden items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Link
            href={`/album/${chart.id}`}
            className="relative w-11 h-11 rounded-lg overflow-hidden shadow-sm flex-shrink-0 bg-neutral-100 dark:bg-neutral-800 border border-black/5 dark:border-white/10 block group/mobileimg"
          >
            <Image
              src={coverUrl}
              alt={chart.title}
              fill
              className="object-cover"
              unoptimized
            />
            {isChartPlaying && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="flex items-end gap-0.5 h-3">
                  <span className="w-0.5 bg-green-400 rounded-full animate-bar-1" />
                  <span className="w-0.5 bg-green-400 rounded-full animate-bar-2" />
                  <span className="w-0.5 bg-green-400 rounded-full animate-bar-3" />
                </div>
              </div>
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/album/${chart.id}`} className="block">
              <h3
                className="text-sm font-bold text-neutral-900 dark:text-white hover:text-[#00c96b] transition-colors truncate"
                title={chart.title}
              >
                {chart.title}
              </h3>
            </Link>
          </div>
        </div>
        <button
          onClick={handlePlayChart}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/20 active:scale-95 text-neutral-800 dark:text-neutral-100 font-semibold text-xs rounded-full transition-all"
        >
          {isChartPlaying ? (
            <>
              <Pause size={12} fill="currentColor" />
              <span>暂停</span>
            </>
          ) : (
            <>
              <Play size={12} fill="currentColor" className="translate-x-0.5" />
              <span>播放</span>
            </>
          )}
        </button>
      </div>

      {/* Main Content: Left Visual & Actions + Right Top Songs Preview */}
      <div className="flex flex-col sm:flex-row gap-5 items-stretch">
        {/* Left Column: Cover + Title + Play Button (仅在 sm: 桌面端展示) */}
        <div className="hidden sm:flex sm:w-36 md:w-40 flex-shrink-0 flex-col items-start justify-between text-left">
          <div className="w-full flex flex-col items-start">
            <Link
              href={`/album/${chart.id}`}
              className="relative w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-xl overflow-hidden shadow-lg group/img border border-white/10 flex-shrink-0 bg-neutral-800 block"
            >
              <Image
                src={coverUrl}
                alt={chart.title}
                fill
                className="object-cover group-hover/img:scale-105 transition-transform duration-500"
                unoptimized
              />
              {isChartPlaying ? (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
                  <div className="flex items-end gap-1 h-5">
                    <span className="w-1 bg-green-400 rounded-full animate-bar-1" />
                    <span className="w-1 bg-green-400 rounded-full animate-bar-2" />
                    <span className="w-1 bg-green-400 rounded-full animate-bar-3" />
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity duration-200">
                  <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white">
                    <Play size={20} fill="white" className="translate-x-0.5" />
                  </div>
                </div>
              )}
            </Link>

            <Link href={`/album/${chart.id}`} className="block w-full mt-3">
              <h3
                className="text-sm sm:text-base font-bold text-white hover:text-green-400 transition-colors truncate"
                title={chart.title}
              >
                {chart.title}
              </h3>
            </Link>
          </div>

          <button
            onClick={handlePlayChart}
            aria-label={isChartPlaying ? "暂停榜单" : "播放全部"}
            className="mt-3 inline-flex items-center justify-center gap-2 px-5 py-2 bg-[#1ed760] hover:bg-[#1fdf64] hover:scale-[1.02] active:scale-[0.98] text-black font-bold text-xs sm:text-sm rounded-full shadow transition-all duration-200 cursor-pointer"
          >
            {isChartPlaying ? (
              <>
                <Pause size={15} fill="black" />
                <span>暂停播放</span>
              </>
            ) : (
              <>
                <Play size={15} fill="black" className="translate-x-0.5" />
                <span>一键播放</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Top 4 Song Previews with Sleek Typographic Rankings */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
          {topSongs.map((song, index) => {
            const isCurrentTrack = currentSong?.id === song.id;
            const isTrackPlaying = isCurrentTrack && isPlaying;
            const songCover = song.album?.coverPath
              ? getAuthenticatedSrc(song.album.coverPath, 100)
              : coverUrl;

            return (
              <div
                key={song.id}
                onClick={(e) => handlePlayTrack(song, e)}
                className={`group/song flex items-center justify-between px-2.5 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                  isCurrentTrack
                    ? "bg-neutral-100/80 dark:bg-white/[0.06] border border-transparent"
                    : "hover:bg-neutral-50 dark:hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2 flex-1">
                  {/* Clean Typographic Rank Number */}
                  <div className="w-5 text-center flex-shrink-0">
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        index === 0
                          ? "text-amber-500 font-extrabold"
                          : index === 1
                            ? "text-slate-400 font-bold"
                            : index === 2
                              ? "text-amber-700 font-bold"
                              : "text-neutral-400"
                      }`}
                    >
                      {index + 1}
                    </span>
                  </div>

                  {/* Thumbnail Cover */}
                  <div className="relative w-11 h-11 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-black/5 dark:border-white/5 shadow-sm">
                    <Image
                      src={songCover}
                      alt={song.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {isTrackPlaying && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="flex items-end gap-0.5 h-3">
                          <span className="w-0.5 bg-green-400 rounded-full animate-bar-1" />
                          <span className="w-0.5 bg-green-400 rounded-full animate-bar-2" />
                          <span className="w-0.5 bg-green-400 rounded-full animate-bar-3" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Song Title & Artist with QQ Music Tag */}
                  <div className="min-w-0 overflow-hidden flex-1">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <p
                        className={`text-xs sm:text-sm font-semibold truncate transition-colors ${
                          isCurrentTrack ? "text-emerald-500" : "text-neutral-900 dark:text-white group-hover/song:text-emerald-500"
                        }`}
                        title={song.title}
                      >
                        {cleanSongTitle(song.title, song.artist)}
                      </p>
                      {song.tag && (
                        <span className="hidden xs:inline-block shrink-0 text-[10px] text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-white/5 px-1.5 py-0.2 rounded border border-black/5 dark:border-white/5 scale-90">
                          {song.tag}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                        {song.artist || "未知歌手"}
                      </p>
                      {song.favCount && (
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
                          · {song.favCount}收藏
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: Duration / Equalizer */}
                <div className="flex items-center gap-1.5 flex-shrink-0 pl-1">
                  {isTrackPlaying ? (
                    <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      播放中
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums">
                      {formatDuration(song.duration)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const MobileQQSongGroup = ({
  chart,
}: {
  chart: ChartAlbum;
}) => {
  const { currentSong, isPlaying, playSong, togglePlayPause } = usePlayerStore();
  const { isSongFavorited, toggleFavoriteSong } = useFavoritesStore();

  const topSongs = (chart.songs || []).slice(0, 3);
  if (topSongs.length === 0) return null;

  const formattedQueue = (chart.songs || []).map((s) => ({
    ...s,
    album:
      s.album && s.album.title && s.album.title !== chart.title
        ? s.album
        : {
            id: chart.id,
            title: chart.title,
            artists: chart.artists || [],
            coverPath: chart.coverPath,
          },
  }));

  const handlePlaySong = (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (currentSong?.id === song.id) {
      togglePlayPause();
      return;
    }
    const targetSong = formattedQueue.find((s) => s.id === song.id) || song;
    playSong(targetSong, formattedQueue);
  };

  return (
    <div className="w-[85vw] max-w-[335px] shrink-0 snap-start flex flex-col gap-1 p-2.5 rounded-2xl bg-white dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:shadow-none">
      {topSongs.map((song) => {
        const isCurrent = currentSong?.id === song.id;
        const isTrackPlaying = isCurrent && isPlaying;
        const isFav = isSongFavorited(song.id);
        const cover = song.album?.coverPath
          ? getAuthenticatedSrc(song.album.coverPath, 120)
          : chart.coverPath
            ? getAuthenticatedSrc(chart.coverPath, 120)
            : "/placeholder.jpg";

        return (
          <div
            key={song.id}
            onClick={(e) => handlePlaySong(song, e)}
            className="flex items-center justify-between gap-2.5 py-1.5 px-1.5 rounded-xl active:bg-neutral-100 dark:active:bg-white/5 transition-colors cursor-pointer select-none group/row"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* 封面 */}
              <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-sm shrink-0 bg-neutral-100 dark:bg-neutral-800 border border-black/5 dark:border-white/5">
                <Image
                  src={cover}
                  alt={song.title}
                  fill
                  className="object-cover group-hover/row:scale-105 transition-transform"
                  unoptimized
                />
                {isTrackPlaying && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="flex items-end gap-0.5 h-3.5">
                      <span className="w-0.5 bg-emerald-400 rounded-full animate-bar-1" />
                      <span className="w-0.5 bg-emerald-400 rounded-full animate-bar-2" />
                      <span className="w-0.5 bg-emerald-400 rounded-full animate-bar-3" />
                    </div>
                  </div>
                )}
              </div>

              {/* 歌名与标签与歌手 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <h4
                    className={`text-xs sm:text-sm font-bold truncate transition-colors ${
                      isCurrent ? "text-emerald-500" : "text-neutral-900 dark:text-white group-hover/row:text-emerald-500"
                    }`}
                  >
                    {cleanSongTitle(song.title, song.artist)}
                  </h4>
                  {song.tag && (
                    <span className="shrink-0 text-[10px] text-neutral-500 dark:text-neutral-400 bg-white dark:bg-white/10 px-1.5 py-0.5 rounded border border-neutral-200/50 dark:border-white/5 font-normal scale-95">
                      {song.tag}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                  {song.artist || chart.artists?.[0]?.name || "未知歌手"}
                </p>
              </div>
            </div>

            {/* 红心收藏按钮与真实单曲收藏量 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavoriteSong(song.id);
              }}
              className={`flex items-center gap-1 text-xs shrink-0 px-2 py-1 active:scale-90 transition-all cursor-pointer ${
                isFav
                  ? "text-rose-500 hover:text-rose-600"
                  : "text-neutral-400 hover:text-rose-500 dark:text-neutral-500 dark:hover:text-rose-400"
              }`}
              title={isFav ? "已收藏" : "收藏"}
            >
              <Heart
                size={15}
                className={isFav ? "fill-rose-500 text-rose-500" : "text-neutral-400"}
              />
              {song.favCount ? (
                <span
                  className={`text-[11px] font-mono tabular-nums transition-colors ${
                    isFav ? "text-rose-500 font-semibold" : "text-neutral-400 dark:text-neutral-400"
                  }`}
                >
                  {song.favCount}
                </span>
              ) : isFav ? (
                <span className="text-[11px] font-mono tabular-nums text-rose-500 font-semibold">
                  已收藏
                </span>
              ) : null}
            </button>
          </div>
        );
      })}
    </div>
  );
};

const FeaturedChartsSection = ({
  hotChart,
  soarChart,
  billboardChart,
  koreaChart,
}: FeaturedChartsSectionProps) => {
  const { playSong } = usePlayerStore();
  if (!hotChart && !soarChart && !billboardChart && !koreaChart) return null;

  const handlePlayAll = () => {
    const primaryChart = hotChart || soarChart;
    if (primaryChart?.songs && primaryChart.songs.length > 0) {
      playSong(primaryChart.songs[0], primaryChart.songs);
    }
  };

  return (
    <section id="featured-charts" className="mb-6 sm:mb-12">
      {/* 标题栏 (对标 QQ 音乐：听「精选热歌」的也在听 ▶ 更多 >) */}
      <div className="flex items-center justify-between mb-2.5 sm:mb-5">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            听「精选热歌」的也在听
          </h2>
          <button
            onClick={handlePlayAll}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 text-neutral-800 dark:text-neutral-200 active:scale-95 transition-all cursor-pointer border border-neutral-200/60 dark:border-white/10 text-[11px] font-semibold select-none shadow-sm"
            title="一键播放全部"
          >
            <Play size={10} fill="#1ed760" className="text-[#1ed760] translate-x-[0.5px]" />
            <span>播放</span>
          </button>
        </div>
        <Link
          href={hotChart ? `/album/${hotChart.id}` : "/playlists"}
          className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center gap-0.5"
        >
          <span>更多</span>
          <ChevronRight size={14} />
        </Link>
      </div>

      {/* 桌面端 2 列网格 (保留桌面端完整榜单卡片) */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hotChart && <ChartCard chart={hotChart} type="hot" />}
        {soarChart && <ChartCard chart={soarChart} type="soar" />}
        {billboardChart && <ChartCard chart={billboardChart} type="billboard" />}
        {koreaChart && <ChartCard chart={koreaChart} type="korea" />}
      </div>

      {/* 移动端 3 行一组横向手势流 (完全对标 QQ 音乐原生歌曲流布局，展示 100% 真实收藏量) */}
      <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2 -mx-1 px-1 scrollbar-none">
        {hotChart && <MobileQQSongGroup chart={hotChart} />}
        {soarChart && <MobileQQSongGroup chart={soarChart} />}
        {billboardChart && <MobileQQSongGroup chart={billboardChart} />}
        {koreaChart && <MobileQQSongGroup chart={koreaChart} />}
      </div>
    </section>
  );
};

export default React.memo(FeaturedChartsSection);
