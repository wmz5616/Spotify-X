"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Play,
  Heart,
  MessageSquare,
  Share2,
  Volume2,
  VolumeX,
  RotateCw,
  TvMinimalPlay,
  Sparkles,
  Check,
  Plus,
} from "lucide-react";
import { useVideoFeedStore, type FeedVideoItem } from "@/store/useVideoFeedStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useToastStore } from "@/store/useToastStore";
import { apiClient } from "@/lib/api-client";

// 精选默认 MV 备选池（高清直链与元数据）
const DEFAULT_VIDEOS: FeedVideoItem[] = [
  {
    id: "14689667",
    title: "早发白帝城",
    artist: "许嵩",
    cover: "https://p1.music.126.net/jhNk0WOkMbDRbocmxt63uQ==/109951169258586066.jpg",
    videoUrl: "https://vodkgeyttp8.vod.126.net/cloudmusic/5045/core/d844/bc63807c4b19d6739d72aa245789605a.mp4?wsSecret=082404dadafb5cbe7d942d499a42e5f5&wsTime=1789372435",
    playCount: "270.4万",
    likesCount: 18920,
    commentsCount: 842,
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
    likesCount: 12430,
    commentsCount: 390,
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
    likesCount: 32610,
    commentsCount: 1205,
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
    likesCount: 5410,
    commentsCount: 148,
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
    likesCount: 3200,
    commentsCount: 92,
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
    likesCount: 2890,
    commentsCount: 65,
    isLiked: false,
    isFollowed: false,
  },
];

export default function VideoFeedPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
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

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);

  // 1. 获取/刷新随机视频
  const fetchRandomVideos = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setIsRefreshing(true);
      try {
        const res = await apiClient<FeedVideoItem[]>("/api/mv/feed?limit=10").catch(
          () => null
        );

        if (Array.isArray(res) && res.length > 0) {
          if (isRefresh || videoList.length === 0) {
            // 洗牌随机并更新列表
            const shuffled = [...res].sort(() => Math.random() - 0.5);
            setVideoList(shuffled);
            setCurrentIndex(0);
          } else {
            appendVideos(res);
          }
        } else {
          // 降级使用默认高质量视频
          if (videoList.length === 0) {
            const shuffled = [...DEFAULT_VIDEOS].sort(() => Math.random() - 0.5);
            setVideoList(shuffled);
          }
        }
      } catch {
        if (videoList.length === 0) {
          setVideoList(DEFAULT_VIDEOS);
        }
      } finally {
        if (isRefresh) {
          setTimeout(() => setIsRefreshing(false), 500);
          addToast("已刷新视频流");
        }
      }
    },
    [videoList.length, setVideoList, appendVideos, setCurrentIndex, addToast]
  );

  // 初始化加载
  useEffect(() => {
    if (!isInitialized || videoList.length === 0) {
      fetchRandomVideos();
    }
  }, [isInitialized, videoList.length, fetchRandomVideos]);

  // 进入视频页时，若有背景音乐在播放则先暂停，避免双重声音
  useEffect(() => {
    if (isAudioPlaying) {
      toggleAudioPlayPause();
    }
  }, []);

  // 2. 切页返回时恢复之前停留的视频卡片位置及播放时间戳
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 滚动到上次播放的索引项
    const targetItem = container.children[currentIndex] as HTMLElement;
    if (targetItem) {
      targetItem.scrollIntoView({ behavior: "instant" as ScrollBehavior });
    }

    const currentVideo = videoRefs.current.get(currentIndex);
    if (currentVideo) {
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

  // 3. 上下滑动吸附与可见度监听（上下滑动切换自动播放）
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number(entry.target.getAttribute("data-index"));
          const video = videoRefs.current.get(index);

          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            // 当前卡片成为主视口视频
            if (index !== currentIndex) {
              // 暂停上一个
              const prevVideo = videoRefs.current.get(currentIndex);
              if (prevVideo) {
                prevVideo.pause();
              }
              setCurrentIndex(index);
              setPlayProgress(0);
            }

            if (video) {
              video.play().catch(() => {});
              setIsPlaying(true);
            }
          } else {
            // 移出视口自动暂停
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

    return () => {
      observer.disconnect();
    };
  }, [videoList.length, currentIndex, setCurrentIndex, setIsPlaying]);

  // 4. 单击切换播放/暂停
  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentVideo = videoRefs.current.get(currentIndex);
    if (!currentVideo) return;

    if (currentVideo.paused) {
      currentVideo.play().catch(() => {});
      setIsPlaying(true);
      setShowPlayIcon(false);
    } else {
      currentVideo.pause();
      setIsPlaying(false);
      setShowPlayIcon(true);
      setSavedTime(currentVideo.currentTime);
    }
  };

  // 5. 视频时间更新
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const target = e.currentTarget;
    if (target.duration > 0) {
      const p = (target.currentTime / target.duration) * 100;
      setPlayProgress(p);
      setSavedTime(target.currentTime);
    }
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
      } catch {}
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      addToast("链接已复制到剪贴板");
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-56px)] md:h-[calc(100vh-90px)] bg-black text-white select-none overflow-hidden">
      {/* 顶部极简操作栏：仅保留“视频”指示与“随机刷新”按钮，完全无搜索栏 */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <TvMinimalPlay className="text-[#1ed760]" size={20} />
          <span className="font-bold text-sm sm:text-base tracking-wide text-white drop-shadow-md">
            视频专区
          </span>
          <span className="text-[10px] text-neutral-300 bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 hidden sm:inline">
            沉浸双击 · 滑动切换
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* 静音切换 */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/90 hover:text-white hover:bg-black/60 transition-all active:scale-95"
            title={isMuted ? "取消静音" : "静音"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {/* 随机刷新 */}
          <button
            onClick={() => fetchRandomVideos(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs font-semibold text-white/90 hover:text-white hover:bg-black/60 transition-all active:scale-95 disabled:opacity-50"
            title="随机刷新"
          >
            <RotateCw
              size={13}
              className={`text-[#1ed760] ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden xs:inline">随机刷新</span>
          </button>
        </div>
      </div>

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
              {/* 背景封面微模糊底图（防止视频黑边突兀） */}
              <div
                className="absolute inset-0 bg-cover bg-center blur-2xl opacity-25 scale-110 pointer-events-none"
                style={{ backgroundImage: `url(${item.cover})` }}
              />

              {/* 核心视频播放器 */}
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
                muted={isMuted}
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

              {/* 右侧互动悬浮按钮条（仿抖音/QQ音乐视频） */}
              <div
                className="absolute right-3.5 sm:right-6 bottom-24 sm:bottom-28 z-30 flex flex-col items-center gap-5 pointer-events-auto"
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

                {/* 2. 点赞 / 收藏 */}
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
                    {item.likesCount
                      ? item.likesCount > 9999
                        ? (item.likesCount / 10000).toFixed(1) + "w"
                        : item.likesCount
                      : "收藏"}
                  </span>
                </div>

                {/* 3. 评论数 */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => addToast("评论区正在开放中")}
                    className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-transform active:scale-75"
                  >
                    <MessageSquare size={22} className="fill-white/20 text-white" />
                  </button>
                  <span className="text-[11px] font-bold text-white drop-shadow">
                    {item.commentsCount || 88}
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

              {/* 底部信息浮层：歌手名、关注按钮、歌曲标题 */}
              <div
                className="absolute left-4 right-20 bottom-16 sm:bottom-20 z-30 pointer-events-auto flex flex-col gap-1.5"
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

                {/* 播放次数与高清标签 */}
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-300 drop-shadow">
                  <span className="flex items-center gap-1">
                    <Sparkles size={11} className="text-[#1ed760]" />
                    {item.playCount} 次观看
                  </span>
                  <span>·</span>
                  <span className="text-[#1ed760] font-mono font-semibold">1080P HD</span>
                </div>
              </div>

              {/* 底部紧贴滑动进度条 */}
              {isCurrent && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/15 z-30 pointer-events-none">
                  <div
                    className="h-full bg-[#1ed760] transition-all duration-100 shadow-[0_0_8px_rgba(30,215,96,0.8)]"
                    style={{ width: `${playProgress}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
