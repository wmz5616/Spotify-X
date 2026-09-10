"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Pause, ChevronRight } from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
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
      tag: "热歌精选",
      desc: "全网收听千万级金曲",
      dot: "bg-rose-400",
      pill: "bg-rose-500/15 text-rose-300 border-rose-500/30",
      glow: "bg-rose-500",
      card: "bg-gradient-to-br from-rose-950/30 via-neutral-900/90 to-black/90 border-rose-500/20 hover:border-rose-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_12px_40px_rgba(244,63,94,0.16)]",
    },
    soar: {
      tag: "飙升新声",
      desc: "近期势头最猛流行力作",
      dot: "bg-indigo-400",
      pill: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
      glow: "bg-indigo-500",
      card: "bg-gradient-to-br from-indigo-950/30 via-neutral-900/90 to-black/90 border-indigo-500/20 hover:border-indigo-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_12px_40px_rgba(99,102,241,0.16)]",
    },
    billboard: {
      tag: "美国公告榜",
      desc: "全球流行权威风向标",
      dot: "bg-emerald-400",
      pill: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      glow: "bg-emerald-500",
      card: "bg-gradient-to-br from-emerald-950/30 via-neutral-900/90 to-black/90 border-emerald-500/20 hover:border-emerald-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.16)]",
    },
    korea: {
      tag: "韩国榜",
      desc: "K-POP 潮流",
      dot: "bg-fuchsia-400",
      pill: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
      glow: "bg-fuchsia-500",
      card: "bg-gradient-to-br from-fuchsia-950/30 via-neutral-900/90 to-black/90 border-fuchsia-500/20 hover:border-fuchsia-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_12px_40px_rgba(217,70,239,0.16)]",
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
    <div
      className={`group relative rounded-2xl overflow-hidden backdrop-blur-xl border transition-all duration-300 hover:-translate-y-1 select-none p-5 sm:p-6 ${themeConfig.card}`}
    >
      {/* Ambient background blur glow */}
      <div
        className={`absolute -top-24 -left-24 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20 ${themeConfig.glow}`}
      />

      {/* Top Header Badge - Clean typography without emoji */}
      <div className="relative z-10 flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md ${themeConfig.pill}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${themeConfig.dot}`} />
            {themeConfig.tag}
          </span>
          <span className="text-xs text-neutral-400 hidden sm:inline-block">
            {themeConfig.desc}
          </span>
        </div>

        <Link
          href={`/album/${chart.id}`}
          className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors group/link font-medium"
        >
          <span>全部 {chart.songs?.length || 50} 首</span>
          <ChevronRight
            size={14}
            className="group-hover/link:translate-x-0.5 transition-transform"
          />
        </Link>
      </div>

      {/* Main Content: Left Visual & Actions + Right Top Songs Preview */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
        {/* Left Column: Cover + Title + Play Button */}
        <div className="sm:col-span-5 flex flex-col items-center sm:items-start text-center sm:text-left">
          <Link
            href={`/album/${chart.id}`}
            className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-xl overflow-hidden shadow-2xl group/img mb-3 border border-white/10 flex-shrink-0"
          >
            <Image
              src={coverUrl}
              alt={chart.title}
              fill
              className="object-cover group-hover/img:scale-105 transition-transform duration-500"
              unoptimized
            />
            {isChartPlaying && (
              <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center">
                <div className="flex items-end gap-1 h-5">
                  <span className="w-1 bg-green-400 rounded-full animate-bar-1" />
                  <span className="w-1 bg-green-400 rounded-full animate-bar-2" />
                  <span className="w-1 bg-green-400 rounded-full animate-bar-3" />
                </div>
              </div>
            )}
          </Link>

          <Link href={`/album/${chart.id}`} className="block w-full">
            <h3 className="text-base sm:text-lg font-bold text-white hover:underline truncate mb-3">
              {chart.title}
            </h3>
          </Link>

          <button
            onClick={handlePlayChart}
            aria-label={isChartPlaying ? "暂停榜单" : "播放全部"}
            className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-green-500 hover:bg-green-400 active:scale-95 text-black font-bold text-sm rounded-full shadow-[0_4px_16px_rgba(34,197,94,0.35)] hover:shadow-[0_6px_22px_rgba(34,197,94,0.55)] transition-all cursor-pointer"
          >
            {isChartPlaying ? (
              <>
                <Pause size={16} fill="black" />
                <span>暂停播放</span>
              </>
            ) : (
              <>
                <Play size={16} fill="black" className="translate-x-0.5" />
                <span>一键播放</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Top 4 Song Previews with Sleek Typographic Rankings */}
        <div className="sm:col-span-7 flex flex-col gap-1.5 w-full">
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
                className={`group/song flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer ${isCurrentTrack
                    ? "bg-white/[0.12] border border-green-500/35 shadow-sm"
                    : "hover:bg-white/[0.08] border border-transparent hover:border-white/5"
                  }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  {/* Clean Typographic Rank Number */}
                  <span
                    className={`w-4 text-center text-sm font-extrabold flex-shrink-0 tabular-nums ${index === 0
                        ? "text-amber-400"
                        : index === 1
                          ? "text-slate-300"
                          : index === 2
                            ? "text-amber-600"
                            : "text-neutral-500 font-semibold"
                      }`}
                  >
                    {index + 1}
                  </span>

                  {/* Thumbnail Cover */}
                  <div className="relative w-9 h-9 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-800 shadow-sm">
                    <Image
                      src={songCover}
                      alt={song.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {isTrackPlaying ? (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="flex items-end gap-0.5 h-3">
                          <span className="w-0.5 bg-green-400 rounded-full animate-bar-1" />
                          <span className="w-0.5 bg-green-400 rounded-full animate-bar-2" />
                          <span className="w-0.5 bg-green-400 rounded-full animate-bar-3" />
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/song:opacity-100 flex items-center justify-center transition-opacity">
                        <Play size={13} fill="white" className="text-white translate-x-0.5" />
                      </div>
                    )}
                  </div>

                  {/* Song Title & Artist */}
                  <div className="min-w-0 overflow-hidden">
                    <p
                      className={`text-xs sm:text-sm font-semibold truncate transition-colors ${isCurrentTrack ? "text-green-400" : "text-white group-hover/song:text-white"
                        }`}
                      title={song.title}
                    >
                      {cleanSongTitle(song.title, song.artist)}
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {song.artist || "未知歌手"}
                    </p>
                  </div>
                </div>

                {/* Duration or Equalizer */}
                <div className="flex items-center flex-shrink-0 text-xs text-neutral-400 pl-2">
                  {isTrackPlaying ? (
                    <span className="text-[11px] font-medium text-green-400 flex items-center gap-1">
                      播放中
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] text-neutral-400">
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

const FeaturedChartsSection = ({
  hotChart,
  soarChart,
  billboardChart,
  koreaChart,
}: FeaturedChartsSectionProps) => {
  if (!hotChart && !soarChart && !billboardChart && !koreaChart) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              榜单精选
            </h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hotChart && <ChartCard chart={hotChart} type="hot" />}
        {soarChart && <ChartCard chart={soarChart} type="soar" />}
        {billboardChart && <ChartCard chart={billboardChart} type="billboard" />}
        {koreaChart && <ChartCard chart={koreaChart} type="korea" />}
      </div>
    </section>
  );
};

export default React.memo(FeaturedChartsSection);
