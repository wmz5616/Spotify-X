"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Play,
  Heart,
  MessageSquare,
  Share2,
  Check,
  Plus,
} from "lucide-react";
import { useVideoFeedStore, type FeedVideoItem } from "@/store/useVideoFeedStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useToastStore } from "@/store/useToastStore";
import { apiClient } from "@/lib/api-client";

// 精选默认 MV 备选池（1080P/720P 高清 HTTPS 直链与真实元数据）
const DEFAULT_VIDEOS: FeedVideoItem[] = [
  {
    id: "14689667",
    title: "早发白帝城",
    artist: "许嵩",
    cover: "https://p1.music.126.net/jhNk0WOkMbDRbocmxt63uQ==/109951169258586066.jpg",
    videoUrl: "https://vodkgeyttp8.vod.126.net/cloudmusic/5045/core/d844/6d46dec1aa3d93a1b243abaf157e8c50.mp4?wsSecret=c6c543d9ec20f84feef2f9e9cb4cc7de&wsTime=1789373585",
    playCount: "270.4万",
    likesCount: 3810,
    commentsCount: 1862,
    isLiked: false,
    isFollowed: false,
  },
  {
    id: "5436712",
    title: "广岛之恋",
    artist: "莫文蔚",
    cover: "https://p1.music.126.net/ijUg7s_2S8GMbTNsYiepJA==/18676304511774727.jpg",
    videoUrl: "https://vodkgeyttp8.vod.126.net/cloudmusic/MjQ3NDQ3MjUw/89a6a279dc2acfcd068b45ce72b1f560/533e4183a709699d566180ed0cd9abe9.mp4?wsSecret=66363c32615960f7178d2e963b594eaa&wsTime=1789372435",
    playCount: "85.1万",
    likesCount: 5214,
    commentsCount: 968,
    isLiked: false,
    isFollowed: false,
  },
  {
    id: "5647230",
    title: "Without You",
    artist: "Avicii",
    cover: "https://p1.music.126.net/m3snLkz33qeJtVRjYIeHTQ==/109951163013469906.jpg",
    videoUrl: "https://vodkgeyttp8.vod.126.net/cloudmusic/mv/20170828101855/8df49678-f917-450f-b694-733308c8124d/f9ea20fa73cce47d88698516c9a83dba.mp4?wsSecret=ca90e42bd658f06010d87632dd92438b&wsTime=1789372435",
    playCount: "340.0万",
    likesCount: 28410,
    commentsCount: 4210,
    isLiked: false,
    isFollowed: false,
  },
  {
    id: "10930039",
    title: "All Night",
    artist: "Afrojack",
    cover: "https://p1.music.126.net/jy1BtkFM2urM20Sx069hRA==/109951164922166904.jpg",
    videoUrl: "https://vodkgeyttp8.vod.126.net/cloudmusic/obj/core/2244802781/27eb282fe9ea954e17b6c3a9bc4c5fae.mp4?wsSecret=82046dc979fa743fa644e4cd689bbb14&wsTime=1789372435",
    playCount: "7.6万",
    likesCount: 1845,
    commentsCount: 312,
    isLiked: false,
    isFollowed: false,
  },
  {
    id: "5441584",
    title: "FLASH",
    artist: "BLU-SWING",
    cover: "https://p1.music.126.net/CLNUCm2DcpmLDrciXal9Xg==/19209567648893216.jpg",
    videoUrl: "https://vodkgeyttp8.vod.126.net/cloudmusic/MTc2NDc4Nzc=/108a81cb487490b6483d4858c26de894/6b0b55ab041ee491a8e458efb4dbd5c8.mp4?wsSecret=023168626c59f78b53ff3054757497c4&wsTime=1789372435",
    playCount: "2.9万",
    likesCount: 890,
    commentsCount: 145,
    isLiked: false,
    isFollowed: false,
  },
  {
    id: "5343489",
    title: "All In My Head (Acoustic)",
    artist: "Tori Kelly",
    cover: "https://p1.music.126.net/GYQ5Sxeam_Gt-5uKHuQPjA==/3419481171413759.jpg",
    videoUrl: "https://vodkgeyttp8.vod.126.net/cloudmusic/Nzg5MzEyMTY=/a7a7cb62c0e6207a680b74ec1a70ca64/34e181f9d6c3842463948a60310e3063.mp4?wsSecret=195fd3f82f82d32aee6b41ce19286346&wsTime=1789372435",
    playCount: "3.0万",
    likesCount: 960,
    commentsCount: 112,
    isLiked: false,
    isFollowed: false,
  },
];

export default function VideoFeedPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  const {
    videoList,
    currentIndex,
    savedTime,
    isPlaying,
    isInitialized,
    setVideoList,
    appendVideos,
    setCurrentIndex,
    setSavedTime,
    setIsPlaying,
    toggleLike,
    toggleFollow,
  } = useVideoFeedStore();

  const { addToast } = useToastStore();
  const { isPlaying: isAudioPlaying, togglePlayPause: toggleAudioPlayPause } = usePlayerStore();

  const [playProgress, setPlayProgress] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const isLoadingMoreRef = useRef(false);

  // 1. 获取/刷新随机视频（服务端已按官方MV>其他优先级排序，优先采用QQ音乐1080P超清无水印源）
  const fetchRandomVideos = useCallback(
    async (isRefresh = false) => {
      try {
        const res = await apiClient<FeedVideoItem[]>("/api/mv/feed?limit=15&offset=0").catch(
          () => null
        );

        if (Array.isArray(res) && res.length > 0) {
          if (isRefresh || videoList.length === 0) {
            // 保持服务端精心编排的官方MV高品质优先序列
            setVideoList(res);
            setCurrentIndex(0);
          } else {
            appendVideos(res);
          }
        } else {
          if (videoList.length === 0) {
            setVideoList(DEFAULT_VIDEOS);
          }
        }
      } catch {
        if (videoList.length === 0) {
          setVideoList(DEFAULT_VIDEOS);
        }
      }
    },
    [videoList.length, setVideoList, appendVideos, setCurrentIndex]
  );

  // 触底无限流加载：当即将滑到列表底部时，自动静默请求下一批高品质MV并平滑追加
  const loadMoreVideos = useCallback(async () => {
    if (isLoadingMoreRef.current) return;
    isLoadingMoreRef.current = true;
    try {
      const nextOffset = videoList.length;
      const res = await apiClient<FeedVideoItem[]>(
        `/api/mv/feed?limit=15&offset=${nextOffset}`
      ).catch(() => null);

      if (Array.isArray(res) && res.length > 0) {
        appendVideos(res);
      }
    } finally {
      setTimeout(() => {
        isLoadingMoreRef.current = false;
      }, 600);
    }
  }, [videoList.length, appendVideos]);

  // 初始化加载
  useEffect(() => {
    if (!isInitialized || videoList.length === 0) {
      fetchRandomVideos();
    }
  }, [isInitialized, videoList.length, fetchRandomVideos]);

  // 进入视频页时，若有背景音乐在播放则先暂停，避免双重声音打架
  useEffect(() => {
    if (isAudioPlaying) {
      toggleAudioPlayPause();
    }
  }, []);

  // 2. 切页返回时恢复之前停留的视频卡片位置及播放时间戳（视频默认有声音）
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const targetItem = container.children[currentIndex] as HTMLElement;
    if (targetItem) {
      targetItem.scrollIntoView({ behavior: "instant" as ScrollBehavior });
    }

    const currentVideo = videoRefs.current.get(currentIndex);
    if (currentVideo) {
      currentVideo.muted = false;
      if (savedTime > 0 && Math.abs(currentVideo.currentTime - savedTime) > 0.5) {
        currentVideo.currentTime = savedTime;
      }
      if (isPlaying) {
        currentVideo.play().catch(() => {
          setIsPlaying(false);
        });
      }
    }

    // 页面卸载（切页到其他页面）时保存进度
    return () => {
      const activeVideo = videoRefs.current.get(currentIndex);
      if (activeVideo) {
        setSavedTime(activeVideo.currentTime);
        activeVideo.pause();
      }
    };
  }, [currentIndex, isInitialized]);

  // 3. 上下滑动吸附与可见度监听（滑入视口自动播放，默认有声音，无限流提前加载）
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number(entry.target.getAttribute("data-index"));
          const video = videoRefs.current.get(index);

          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            if (index !== currentIndex) {
              const prevVideo = videoRefs.current.get(currentIndex);
              if (prevVideo) {
                prevVideo.pause();
              }
              setCurrentIndex(index);
              setPlayProgress(0);
            }

            if (video) {
              video.muted = false;
              video.play().catch(() => { });
              setIsPlaying(true);
            }

            // 无限流触发：当滑动到最后 3 个视频以内时，提前自动加载下一批视频并平滑追加
            if (index >= videoList.length - 3) {
              loadMoreVideos();
            }
          } else {
            if (video) {
              video.pause();
            }
          }
        });
      },
      {
        root: container,
        threshold: [0.6],
      }
    );

    Array.from(container.children).forEach((child) => {
      observer.observe(child);
    });

    // 监听容器滚动，作为触底检测双重保障
    const handleScroll = () => {
      if (
        container.scrollHeight - (container.scrollTop + container.clientHeight) <
        container.clientHeight * 2
      ) {
        loadMoreVideos();
      }
    };
    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      container.removeEventListener("scroll", handleScroll);
    };
  }, [videoList.length, currentIndex, setCurrentIndex, setIsPlaying, loadMoreVideos]);

  // 4. 单击屏幕中央切换播放/暂停
  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentVideo = videoRefs.current.get(currentIndex);
    if (!currentVideo) return;

    if (currentVideo.paused) {
      currentVideo.muted = false;
      currentVideo.play().catch(() => { });
      setIsPlaying(true);
    } else {
      currentVideo.pause();
      setIsPlaying(false);
      setSavedTime(currentVideo.currentTime);
    }
  };

  // 5. 视频播放时间更新（非拖拽时更新进度）
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (isSeeking) return;
    const target = e.currentTarget;
    if (target.duration > 0) {
      const p = (target.currentTime / target.duration) * 100;
      setPlayProgress(p);
      setSavedTime(target.currentTime);
    }
  };

  // 6. 进度条点击与拖拽跳转逻辑
  const handleSeek = (clientX: number) => {
    const bar = progressBarRef.current;
    const currentVideo = videoRefs.current.get(currentIndex);
    if (!bar || !currentVideo || !currentVideo.duration) return;

    const rect = bar.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = clickX / rect.width;
    const newTime = percentage * currentVideo.duration;

    currentVideo.currentTime = newTime;
    setPlayProgress(percentage * 100);
    setSavedTime(newTime);
  };

  const handleProgressBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsSeeking(true);
    handleSeek(e.clientX);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleSeek(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      setIsSeeking(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleProgressBarTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsSeeking(true);
    if (e.touches[0]) {
      handleSeek(e.touches[0].clientX);
    }

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches[0]) {
        handleSeek(moveEvent.touches[0].clientX);
      }
    };

    const handleTouchEnd = () => {
      setIsSeeking(false);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };

    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  };

  // 分享功能
  const handleShare = async (item: FeedVideoItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${item.title} - ${item.artist}`,
          url: window.location.href,
        });
        return;
      } catch { }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      addToast("链接已复制到剪贴板");
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-56px)] md:h-[calc(100vh-90px)] bg-black text-white select-none overflow-hidden">
      {/* 竖向全屏滚动容器（CSS Scroll Snap） */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-scroll scroll-smooth snap-y snap-mandatory no-scrollbar"
        style={{
          scrollSnapType: "y mandatory",
        }}
      >
        {videoList.map((item, idx) => {
          const isCurrent = idx === currentIndex;
          return (
            <div
              key={item.id + idx}
              data-index={idx}
              onClick={handleTogglePlay}
              className="relative w-full h-full snap-start snap-always shrink-0 flex items-center justify-center bg-black overflow-hidden cursor-pointer"
            >
              {/* 背景封面微模糊底图（柔和过渡，消除黑边突兀） */}
              <div
                className="absolute inset-0 bg-cover bg-center blur-2xl opacity-25 scale-110 pointer-events-none"
                style={{ backgroundImage: `url(${item.cover})` }}
              />

              {/* 核心视频播放器（默认有声音，无视口静音限制） */}
              <video
                ref={(el) => {
                  if (el) {
                    videoRefs.current.set(idx, el);
                  } else {
                    videoRefs.current.delete(idx);
                  }
                }}
                src={item.videoUrl}
                poster={item.cover}
                loop
                playsInline
                muted={false}
                preload={Math.abs(idx - currentIndex) <= 1 ? "auto" : "none"}
                onTimeUpdate={isCurrent ? handleTimeUpdate : undefined}
                className="w-full h-full object-contain relative z-10"
              />

              {/* 中央大播放图标（暂停时显式展示） */}
              {isCurrent && !isPlaying && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none animate-in fade-in zoom-in-75 duration-150">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl">
                    <Play size={32} className="fill-white ml-1 text-white" />
                  </div>
                </div>
              )}

              {/* 右侧互动悬浮按钮条（真实点赞与评论数据展示） */}
              <div
                className="absolute right-3.5 sm:right-6 bottom-20 sm:bottom-24 z-30 flex flex-col items-center gap-5 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 1. 歌手头像与关注加号 */}
                <div className="relative flex flex-col items-center mb-1">
                  <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-[#1ed760] to-white/40 shadow-lg">
                    <div className="relative w-full h-full rounded-full overflow-hidden bg-neutral-800">
                      <Image
                        src={item.cover}
                        alt={item.artist}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFollow(item.id)}
                    className={`absolute -bottom-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-md transition-all active:scale-75 ${
                      item.isFollowed
                        ? "bg-[#1ed760] text-black"
                        : "bg-[#e91e63] hover:scale-110"
                    }`}
                  >
                    {item.isFollowed ? <Check size={11} strokeWidth={3} /> : <Plus size={12} strokeWidth={3} />}
                  </button>
                </div>

                {/* 2. 真实点赞量 */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => toggleLike(item.id)}
                    className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-transform active:scale-75"
                  >
                    <Heart
                      size={24}
                      className={
                        item.isLiked
                          ? "fill-[#fe2c55] text-[#fe2c55] animate-[ping_0.2s_ease-out]"
                          : "text-white"
                      }
                    />
                  </button>
                  <span className="text-[11px] font-bold text-white drop-shadow">
                    {item.likesCount !== undefined && item.likesCount > 0
                      ? item.likesCount > 9999
                        ? (item.likesCount / 10000).toFixed(1) + "w"
                        : item.likesCount
                      : "点赞"}
                  </span>
                </div>

                {/* 3. 真实评论量 */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => addToast("评论区正在开放中")}
                    className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-transform active:scale-75"
                  >
                    <MessageSquare size={22} className="fill-white/20 text-white" />
                  </button>
                  <span className="text-[11px] font-bold text-white drop-shadow">
                    {item.commentsCount !== undefined && item.commentsCount > 0
                      ? item.commentsCount > 9999
                        ? (item.commentsCount / 10000).toFixed(1) + "w"
                        : item.commentsCount
                      : "评论"}
                  </span>
                </div>

                {/* 4. 分享 */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={(e) => handleShare(item, e)}
                    className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-transform active:scale-75"
                  >
                    <Share2 size={21} className="text-white" />
                  </button>
                  <span className="text-[11px] font-bold text-white drop-shadow">分享</span>
                </div>
              </div>

              {/* 底部信息浮层：已移除观看次数与分辨率标签，只保留歌手名与视频标题 */}
              <div
                className="absolute left-4 right-20 bottom-8 sm:bottom-10 z-30 pointer-events-auto flex flex-col gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 歌手名与关注胶囊 */}
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-wide drop-shadow-md">
                    @{item.artist}
                  </h2>
                  <button
                    onClick={() => toggleFollow(item.id)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
                      item.isFollowed
                        ? "bg-white/20 text-neutral-300 border border-white/10"
                        : "bg-white text-black hover:bg-neutral-200"
                    }`}
                  >
                    {item.isFollowed ? "已关注" : "关注"}
                  </button>
                </div>

                {/* 视频标题 */}
                <p className="text-xs sm:text-sm text-neutral-100 font-medium line-clamp-2 leading-relaxed drop-shadow-sm max-w-lg">
                  {item.title}
                </p>
              </div>

              {/* 底部支持拖拽与点击跳转的动态视频进度条 */}
              {isCurrent && (
                <div
                  ref={progressBarRef}
                  onMouseDown={handleProgressBarMouseDown}
                  onTouchStart={handleProgressBarTouchStart}
                  className="absolute bottom-0 left-0 right-0 h-4 flex items-end cursor-pointer z-40 group/progress"
                >
                  <div className="w-full h-[3px] group-hover/progress:h-[5px] bg-white/20 transition-all relative">
                    <div
                      className="h-full bg-[#1ed760] transition-all duration-75 relative shadow-[0_0_8px_rgba(30,215,96,0.8)]"
                      style={{ width: `${playProgress}%` }}
                    >
                      {/* 进度条拖拽手柄圆形浮标 */}
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
