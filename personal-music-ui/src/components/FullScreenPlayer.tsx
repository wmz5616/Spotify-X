"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Volume2,
  VolumeX,
} from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import LyricDisplay from "./LyricDisplay";
import Image from "next/image";
import Link from "next/link";
import { getAuthenticatedSrc } from "@/lib/api-client";
import { Song } from "@/types";
import LikeButton from "./LikeButton";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { useUserStore } from "@/store/useUserStore";
import { useToastStore } from "@/store/useToastStore";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);



const PlayPauseButton = ({
  isPlaying,
  onClick,
}: {
  isPlaying: boolean;
  onClick: () => void;
}) => {
  return (
    <motion.button
      onClick={onClick}
      className="relative p-6 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)] overflow-hidden"
      whileTap={{ scale: 0.9 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isPlaying ? (
          <motion.div
            key="pause"
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            <Pause className="w-8 h-8 fill-current" />
          </motion.div>
        ) : (
          <motion.div
            key="play"
            initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            <Play className="w-8 h-8 fill-current pl-1" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

const FullScreenPlayer = () => {
  const {
    isFullScreen,
    toggleFullScreen,
    currentSong,
    isPlaying,
    togglePlayPause,
    playNext,
    playPrev,
    duration,
    currentTime,
    seek,
    playMode,
    toggleShuffle,
    toggleRepeat,
    volume,
    setVolume,
  } = usePlayerStore();

  const { isSongFavorited, toggleFavoriteSong } = useFavoritesStore();
  const { isAuthenticated } = useUserStore();
  const { addToast } = useToastStore();
  const [imgError, setImgError] = useState(false);
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  
  const recordAnim = useRef<gsap.core.Tween | null>(null);

  useGSAP(() => {
    if (!playerWrapperRef.current || !isFullScreen) return;
    
    // Set initial position immediately based on whether it is already playing
    gsap.set(".arm-rotate-group", { rotation: isPlaying ? 22 : -20, svgOrigin: "60 40" });
  }, { dependencies: [isFullScreen], scope: playerWrapperRef });

  // Handle play/pause toggle animations safely
  useGSAP(() => {
    if (!playerWrapperRef.current || !isFullScreen) return;
    
    if (isPlaying) {
      gsap.to(".arm-rotate-group", { rotation: 22, duration: 0.5, ease: "power2.out", svgOrigin: "60 40", overwrite: "auto" });
    } else {
      gsap.to(".arm-rotate-group", { rotation: -20, duration: 0.5, ease: "power2.in", svgOrigin: "60 40", overwrite: "auto" });
    }
  }, { dependencies: [isPlaying, isFullScreen], scope: playerWrapperRef });

  useEffect(() => {
    setImgError(false);
  }, [currentSong?.id]);

  if (!currentSong) return null;

  const getCoverUrl = () => {
    const tParam = currentSong.album?.title ? `&t=${encodeURIComponent(currentSong.album.title)}` : "";
    if (currentSong.album?.id) {
      return getAuthenticatedSrc(`api/covers/${currentSong.album.id}?size=600${tParam}`);
    }

    const path = currentSong.album?.coverPath;

    if (!path || path === "undefined" || path === "null") return null;

    if (path.startsWith("http")) return path;

    const cleanPath = path.startsWith("/") ? path : `/${path}`;

    if (cleanPath.startsWith("/public")) {
      return getAuthenticatedSrc(cleanPath);
    }

    return getAuthenticatedSrc(`/public${cleanPath}`);
  };

  const albumCover = getCoverUrl();

  const getArtistName = () => {
    if (
      currentSong.album?.artists &&
      Array.isArray(currentSong.album.artists) &&
      currentSong.album.artists.length > 0
    ) {
      return currentSong.album.artists.map((a) => a.name).join(", ");
    }

    if (currentSong.artist) return currentSong.artist;

    return "Unknown Artist";
  };

  const artistName = getArtistName();

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = Number(e.target.value);
    seek(newVal);

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(5);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value));
  };

  const handleTogglePlay = () => {
    togglePlayPause();
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const isLiked = currentSong ? isSongFavorited(currentSong.id) : false;

  const handleLike = async () => {
    if (!currentSong) return;
    if (!isAuthenticated) {
      addToast("请先登录");
      return;
    }
    await toggleFavoriteSong(currentSong.id);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([10, 30, 10]);
    }
  };

  const FallbackCover = ({ opacity = 1, size = "text-6xl" }) => (
    <div
      className={`w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-600`}
      style={{ opacity }}
    >
      <span className={`${size} font-bold opacity-30`}>♪</span>
    </div>
  );

  const renderRepeatIcon = () => {
    if (playMode === "repeat-one") return <Repeat1 className="w-6 h-6" />;
    return <Repeat className="w-6 h-6" />;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const volumePercent = volume * 100;

  return (
    <AnimatePresence>
      {isFullScreen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
          className="fixed inset-0 z-50 flex flex-col bg-black text-white overflow-hidden"
        >
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Solid dark base */}
            <div className="absolute inset-0 bg-neutral-950" />
            
            {albumCover && !imgError && (
              <motion.div
                className="absolute inset-0 w-[140%] h-[140%] -left-[20%] -top-[20%]"
                animate={{
                  scale: [1, 1.05, 1],
                  rotate: [0, 4, -4, 0],
                }}
                transition={{
                  duration: 25,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                <Image
                  src={albumCover}
                  alt="Atmosphere"
                  fill
                  className="object-cover blur-[120px] saturate-[2.5] opacity-80"
                  priority
                  unoptimized
                  onError={() => setImgError(true)}
                />
              </motion.div>
            )}

            {/* Frost Glass Overlay - Keeps it dark and readable but lets colors bleed through beautifully */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[50px]" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />
            
            {/* Dynamic ambient highlight */}
            <motion.div 
               className="absolute inset-0 mix-blend-overlay"
               style={{ backgroundImage: 'radial-gradient(ellipse at top, rgba(255,255,255,0.3) 0%, transparent 70%)' }}
               animate={{ opacity: [0.1, 0.4, 0.1] }}
               transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <div className="relative z-10 flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
            <button
              onClick={toggleFullScreen}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronDown className="w-8 h-8 text-neutral-200" />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium tracking-widest uppercase text-white/70">
                Now Playing
              </span>
            </div>
            <div className="w-12" />
          </div>

          <div className="relative z-10 flex-1 flex flex-col md:grid md:grid-cols-2 gap-8 p-6 md:p-12 overflow-y-auto md:overflow-hidden scrollbar-hide">
            <div className="flex flex-col justify-center items-center md:h-full gap-4 md:gap-8 w-full min-h-min pb-8 md:pb-0">
              <motion.div
                layoutId={`album-cover-${currentSong.id}`}
                ref={playerWrapperRef}
                className="relative aspect-square w-full max-w-[320px] md:max-w-none md:w-auto md:h-full md:max-h-[45vh] shrink-0 origin-center perspective-[1200px] mb-4 md:mb-0 cursor-pointer"
                transition={{
                  layout: { duration: 0.4, ease: [0.32, 0.72, 0, 1] }
                }}
              >
                {/* 3D Player Wrapper */}
                <div className="player-3d-wrapper relative w-full h-full transform-style-3d" style={{ transformStyle: "preserve-3d" }}>
                    
                    {/* The Player Base Thickness and Shadows - Aluminum Metal Base */}
                    {/* Deep Contact Shadow */}
                    <div className="absolute inset-0 translate-y-6 translate-x-3 rounded-[2rem] bg-black/60 blur-[30px] pointer-events-none" />
                    {/* Ambient Core Shadow */}
                    <div className="absolute inset-0 translate-y-2 rounded-[2rem] bg-black/40 blur-xl pointer-events-none" />
                    {/* Base Thickness Edge (Metallic) */}
                    <div className="absolute inset-0 translate-y-1 rounded-[2rem] bg-[#a3a3a3] border-b-2 border-r-2 border-black/30 pointer-events-none" />

                    {/* The Player Base (Brushed Aluminum Front) */}
                    <div className="player-base absolute inset-0 rounded-[2rem] bg-[#e4e5e9] shadow-[inset_2px_2px_5px_rgba(255,255,255,0.9),inset_-3px_-3px_8px_rgba(0,0,0,0.15),0_15px_40px_rgba(0,0,0,0.25)] overflow-hidden transform -translate-z-6">
                        
                        {/* Fine Sandblasted Aluminum Noise (Refined for premium texture) */}
                        <div className="absolute inset-0 opacity-[0.22] mix-blend-multiply pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

                        {/* Metallic Lighting Gradients */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-transparent to-black/15 pointer-events-none mix-blend-overlay" />
                        
                        {/* Soft Base Reflection */}
                        <div className="absolute bottom-0 right-0 w-[100%] h-[100%] bg-[radial-gradient(circle_at_bottom_right,rgba(0,0,0,0.1)_0%,transparent_60%)] pointer-events-none" />
                    </div>

                    {/* Platter Thickness/Shadow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[48%] w-[76%] aspect-square rounded-full bg-black/80 blur-lg shadow-[0_20px_35px_rgba(0,0,0,0.7)] pointer-events-none" />
                    
                    {/* Platter Base (The actual spinning vinyl record!) */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[76%] aspect-square rounded-full flex items-center justify-center pointer-events-none">
                        
                        {/* 1. The Vinyl Record Base (The ONLY spinning part) */}
                        <div 
                            className="vinyl-record absolute inset-[2%] rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.8),inset_0_0_0_1px_rgba(255,255,255,0.1)] flex items-center justify-center overflow-hidden border-[3px] border-[#0a0a0a] bg-[#111] will-change-transform"
                            style={{ 
                                animation: "spin 8s linear infinite", 
                                animationPlayState: isPlaying ? "running" : "paused" 
                            }}
                        >
                            {/* Subtle dark vinyl base gradient to give it form */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#222_0%,#000_100%)] pointer-events-none" />

                            {/* The Center Label (White paper base + Album Cover inside) */}
                            <div className="absolute w-[65%] aspect-square rounded-full bg-neutral-200 shadow-[0_0_15px_rgba(0,0,0,0.8)] flex items-center justify-center overflow-hidden z-10 border border-black/20">
                                {/* Simulated paper texture */}
                                <div className="absolute inset-0 opacity-20 mix-blend-multiply pointer-events-none z-20" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
                                
                                {albumCover && !imgError ? (
                                    <Image
                                        src={albumCover}
                                        alt={currentSong.title}
                                        fill
                                        className="object-cover opacity-95"
                                        unoptimized
                                        sizes="(max-width: 768px) 150px, 200px"
                                        onError={() => setImgError(true)}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-neutral-200 flex items-center justify-center"><span className="text-neutral-400 text-xs font-bold">LP</span></div>
                                )}
                            </div>
                        </div>
                        
                        {/* 2. Environmental Reflections & Grooves (These stay STATIC while the record spins beneath!) */}
                        <div className="absolute inset-[2%] rounded-full pointer-events-none z-10 overflow-hidden">
                            
                            {/* Anisotropic 'Bowtie' Vinyl Shine (The defining look of physical records) */}
                            <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_15deg,transparent_0%,rgba(255,255,255,0.4)_10%,transparent_20%,transparent_40%,rgba(255,255,255,0.15)_50%,transparent_60%,transparent_80%,rgba(255,255,255,0.4)_90%,transparent_100%)] mix-blend-screen opacity-90" />
                            
                            {/* Subtle Secondary Cross-Reflection */}
                            <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_105deg,transparent_0%,rgba(255,255,255,0.2)_5%,transparent_10%,transparent_45%,rgba(255,255,255,0.08)_50%,transparent_55%,transparent_90%,rgba(255,255,255,0.2)_95%,transparent_100%)] mix-blend-screen opacity-80" />

                            {/* Dense Vinyl Grooves for Realism (Black vinyl needs extremely dense, subtle grooves) */}
                            <div className="absolute inset-[4%] border border-white/5 rounded-full" />
                            <div className="absolute inset-[8%] border border-white/10 rounded-full" />
                            <div className="absolute inset-[13%] border border-white/5 rounded-full" />
                            <div className="absolute inset-[18%] border border-black/50 rounded-full" />
                            <div className="absolute inset-[24%] border border-white/10 rounded-full shadow-[inset_0_0_8px_rgba(0,0,0,0.8)]" />
                            <div className="absolute inset-[30%] border border-white/5 rounded-full" />
                            <div className="absolute inset-[38%] border border-white/10 rounded-full" />
                            <div className="absolute inset-[50%] border border-black/40 rounded-full" />
                            
                            {/* Inner run-out groove area */}
                            <div className="absolute w-[40%] aspect-square top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-white/10 rounded-full bg-black/10" />
                                
                            {/* The Center Spindle/Hole (Polished Metal Chrome with shadow drop) */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[6%] h-[6%] bg-neutral-300 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.4),0_2px_4px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.8)] z-20 flex items-center justify-center">
                                <div className="w-[50%] h-[50%] bg-gradient-to-tr from-neutral-600 via-white to-neutral-500 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,1)]" />
                            </div>
                        </div>

                        {/* Static Environmental Reflection on Vinyl (Does NOT spin) */}
                        <div className="absolute inset-[2%] rounded-full pointer-events-none z-10 mix-blend-screen opacity-50" style={{ background: "conic-gradient(from 120deg at 50% 50%, transparent 0deg, rgba(255,255,255,0.15) 20deg, transparent 40deg, transparent 180deg, rgba(255,255,255,0.15) 200deg, transparent 220deg, transparent 360deg)" }} />
                    </div>

                    {/* Details: Power light and Toggle Switch (Bottom left) */}
                    <div className="absolute bottom-[8%] left-[6%] flex items-end gap-3 z-10 pointer-events-none">
                        {/* Ultra-Realistic Indicator LED Socket */}
                        <div className="relative w-4 h-4 rounded-full bg-gradient-to-b from-[#0a0a0a] to-[#2a2a2a] shadow-[inset_0_2px_4px_rgba(0,0,0,1),0_1px_1px_rgba(255,255,255,0.7)] flex items-center justify-center mb-1">
                            {/* Glass LED Bulb (Jelly-like depth and specularity) */}
                            <div className={`relative w-[11px] h-[11px] rounded-full transition-all duration-500 overflow-hidden ${
                                isPlaying 
                                    ? 'bg-gradient-to-br from-[#86efac] to-[#14532d] shadow-[inset_0_-2px_4px_rgba(255,255,255,0.5),inset_0_2px_6px_rgba(0,0,0,0.3),0_0_8px_2px_rgba(74,222,128,0.5)]' 
                                    : 'bg-gradient-to-br from-[#166534] to-[#022c22] shadow-[inset_0_-1px_2px_rgba(255,255,255,0.15),inset_0_2px_6px_rgba(0,0,0,0.9)]'
                            }`}>
                                {/* Primary Specular Highlight (Curved Top-Left glass reflection) */}
                                <div className="absolute top-[10%] left-[15%] w-[45%] h-[30%] bg-gradient-to-b from-white/90 to-white/20 rounded-full rotate-[-25deg] blur-[0.5px]" />
                                {/* Bottom Ambient Light Diffusion (The inner glow of the diode) */}
                                <div className={`absolute bottom-[-10%] left-[10%] w-[80%] h-[50%] rounded-full blur-[2px] ${isPlaying ? 'bg-[#22c55e]/90' : 'bg-[#4ade80]/10'}`} />
                            </div>
                        </div>
                        {/* Toggle Switch Base */}
                        <div 
                            className="w-5 h-10 bg-neutral-900 rounded-full shadow-[inset_0_4px_10px_rgba(0,0,0,1),0_1px_1px_rgba(255,255,255,0.8)] p-[2px] relative pointer-events-auto cursor-pointer group"
                            onClick={(e) => {
                                e.stopPropagation();
                                togglePlayPause();
                            }}
                        >
                            {/* Toggle Handle */}
                            <div className={`w-full h-[55%] bg-gradient-to-b from-neutral-200 to-neutral-500 rounded-full shadow-[0_3px_5px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-neutral-600 transition-transform duration-300 ease-in-out group-hover:brightness-110 ${isPlaying ? 'translate-y-0' : 'translate-y-[80%]'}`} />
                        </div>
                    </div>

                    {/* Details: Pitch Slider (Bottom right) */}
                    <div className="absolute bottom-[6%] right-[8%] w-[6%] h-[18%] flex flex-col items-center justify-center pointer-events-auto z-10">
                        <div className="w-2.5 h-full bg-neutral-900 rounded-full shadow-[inset_0_2px_6px_rgba(0,0,0,0.9),0_1px_1px_rgba(255,255,255,0.8)] relative flex justify-center">
                            
                            {/* Hidden Input for Volume Control */}
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize z-20"
                                style={{ WebkitAppearance: 'slider-vertical', writingMode: 'bt-lr' } as any}
                            />

                            {/* Slider Handle */}
                            <div 
                                className="absolute w-[350%] h-4 bg-gradient-to-b from-neutral-200 to-neutral-400 rounded-sm shadow-[0_3px_5px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.9)] border border-neutral-500 pointer-events-none transition-all duration-75"
                                style={{ top: `${(1 - volume) * 80}%` }}
                            />
                            
                            {/* Scale marks */}
                            <div className="absolute top-[20%] right-[-150%] w-[100%] h-[1px] bg-neutral-400 pointer-events-none" />
                            <div className="absolute top-[50%] right-[-200%] w-[150%] h-[1px] bg-neutral-400 pointer-events-none" />
                            <div className="absolute top-[80%] right-[-150%] w-[100%] h-[1px] bg-neutral-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* The Metallic Tonearm */}
                    <div className="tonearm absolute top-[3%] right-[3%] translate-x-[22%] translate-y-[-12%] w-[28%] h-[90%] pointer-events-none z-20 filter drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)]">
                        {/* Group for rotation */}
                        <div className="tonearm-group absolute inset-0">
                            <svg viewBox="0 0 120 300" className="w-full h-full overflow-visible" fill="none" xmlns="http://www.w3.org/2000/svg">
                                {/* SVG Definitions for premium metallic gradients */}
                                <defs>
                                    <linearGradient id="metalPipe" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#8a939e" />
                                        <stop offset="20%" stopColor="#ffffff" />
                                        <stop offset="40%" stopColor="#5c6370" />
                                        <stop offset="55%" stopColor="#2c313a" />
                                        <stop offset="80%" stopColor="#ffffff" />
                                        <stop offset="100%" stopColor="#6b7280" />
                                    </linearGradient>
                                    <linearGradient id="darkMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#4a4d59" />
                                        <stop offset="50%" stopColor="#1a1c23" />
                                        <stop offset="100%" stopColor="#0d0e12" />
                                    </linearGradient>
                                    <radialGradient id="pivotGlow" cx="50%" cy="50%" r="50%">
                                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
                                        <stop offset="100%" stopColor="#000000" stopOpacity="0.9" />
                                    </radialGradient>
                                </defs>

                                {/* Pivot Base Complex and Arm Grouped for Perfect Rotation */}
                                <g className="arm-rotate-group">
                                    {/* --- 1. Pivot Base (Refined Dark & Silver Texture) --- */}
                                    <circle cx="60" cy="40" r="38" fill="#1a1c23" stroke="#333" strokeWidth="2" />
                                    <circle cx="60" cy="40" r="32" fill="url(#darkMetal)" />
                                    {/* Inner bright silver hub */}
                                    <circle cx="60" cy="40" r="16" fill="url(#metalPipe)" stroke="#ddd" strokeWidth="1.5" />
                                    <circle cx="60" cy="40" r="16" fill="url(#pivotGlow)" opacity="0.6" />
                                    <circle cx="60" cy="40" r="4" fill="#111" />
                                    
                                    {/* --- 2. Arm Balance Weight --- */}
                                    <rect x="57" y="-20" width="6" height="30" fill="url(#metalPipe)" />
                                    <rect x="45" y="-35" width="30" height="22" rx="2" fill="url(#darkMetal)" stroke="#333" strokeWidth="1" />
                                    <rect x="45" y="-18" width="30" height="6" fill="url(#metalPipe)" />
                                    <rect x="50" y="-40" width="20" height="5" rx="1" fill="url(#metalPipe)" />
                                    
                                    {/* --- 3. Main Arm Pipe - J-Shape --- */}
                                    <path d="M 60 40 L 55 240 Q 50 310 20 330" fill="none" stroke="url(#metalPipe)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                                    {/* Pipe Highlight */}
                                    <path d="M 60 40 L 55 240 Q 50 310 20 330" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6" transform="translate(-1, -1)" />
                                    
                                    {/* --- 4. Headstock Connection --- */}
                                    {/* Connecting the end of the J curve to the headstock */}
                                    <path d="M 20 330 L 5 340" stroke="url(#metalPipe)" strokeWidth="6" strokeLinecap="round" />
                                    
                                    {/* --- 5. Headstock / Cartridge --- */}
                                    <g transform="translate(-5, 335) rotate(-35)">
                                        <rect x="-12" y="0" width="24" height="40" rx="4" fill="url(#darkMetal)" stroke="#555" strokeWidth="1" />
                                        <rect x="-10" y="2" width="20" height="15" rx="2" fill="#222" />
                                        <circle cx="-5" cy="8" r="2" fill="#fff" opacity="0.8" />
                                        <circle cx="5" cy="8" r="2" fill="#fff" opacity="0.8" />
                                        <rect x="-10" y="25" width="20" height="8" rx="1" fill="url(#metalPipe)" />
                                        {/* Stylus needle */}
                                        <path d="M 0 33 L 0 42" stroke="#fff" strokeWidth="1.5" />
                                        {/* Active green LED */}
                                        <circle cx="8" cy="37" r="1.5" fill={isPlaying ? "#4ade80" : "#444"} className="transition-colors duration-500" />
                                    </g>
                                </g>
                            </svg>
                        </div>
                    </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="w-full max-w-[500px] space-y-4 shrink-0 px-2"
              >
                <div className="flex justify-between items-end">
                  <div className="space-y-1 overflow-hidden flex-1 mr-4">
                    <h2 className="text-2xl md:text-3xl font-bold truncate drop-shadow-lg">
                      {currentSong.title}
                    </h2>
                    <p className="text-lg md:text-xl text-neutral-300 truncate font-medium flex gap-1">
                      {currentSong.album?.artists && currentSong.album.artists.length > 0 ? (
                        currentSong.album.artists.map((artist, index) => (
                          <React.Fragment key={artist.id}>
                            <Link
                              href={`/artist/${encodeURIComponent(artist.name)}`}
                              className="hover:underline hover:text-white transition-colors"
                              onClick={toggleFullScreen}
                            >
                              {artist.name}
                            </Link>
                            {index < (currentSong.album?.artists?.length || 0) - 1 && ", "}
                          </React.Fragment>
                        ))
                      ) : (
                        <span>{currentSong.artist || "Unknown Artist"}</span>
                      )}
                    </p>
                  </div>

                  <LikeButton isLiked={isLiked} onToggle={handleLike} />
                </div>

                <div className="pt-2 space-y-2">
                  <div className="group relative flex items-center w-full h-4 cursor-pointer">
                    <div className="absolute left-0 w-full h-1 bg-white/20 rounded-full overflow-hidden group-hover:h-1.5 transition-all duration-300 ease-out backdrop-blur-sm">
                      <div
                        className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <div
                      className="absolute h-3 w-3 bg-white rounded-full shadow-lg opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none"
                      style={{
                        left: `${progressPercent}%`,
                        transform: "translateX(-50%)",
                      }}
                    />

                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                  </div>

                  <div className="flex justify-between text-xs font-medium text-neutral-300 px-0.5">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center px-2">
                  <button
                    onClick={toggleShuffle}
                    className={`transition-colors hover:scale-110 active:scale-95 ${playMode === "shuffle"
                      ? "text-green-500"
                      : "text-neutral-300 hover:text-white"
                      }`}
                  >
                    <Shuffle className="w-5 h-5 md:w-6 md:h-6" />
                  </button>

                  <div className="flex items-center gap-6 md:gap-8">
                    <button
                      onClick={playPrev}
                      className="text-white transition-colors hover:scale-110 active:scale-95 drop-shadow-md"
                    >
                      <SkipBack className="w-8 h-8 md:w-10 md:h-10 fill-current" />
                    </button>

                    <PlayPauseButton
                      isPlaying={isPlaying}
                      onClick={handleTogglePlay}
                    />

                    <button
                      onClick={playNext}
                      className="text-white transition-colors hover:scale-110 active:scale-95 drop-shadow-md"
                    >
                      <SkipForward className="w-8 h-8 md:w-10 md:h-10 fill-current" />
                    </button>
                  </div>

                  <button
                    onClick={toggleRepeat}
                    className={`transition-colors hover:scale-105 active:scale-95 ${playMode.includes("repeat")
                      ? "text-green-500"
                      : "text-neutral-300 hover:text-white"
                      }`}
                  >
                    {renderRepeatIcon()}
                  </button>
                </div>

                <div className="flex items-center gap-3 pt-4 px-4">
                  <button
                    onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
                    className="text-neutral-300 hover:text-white"
                  >
                    {volume === 0 ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  <div className="group relative flex items-center flex-1 h-4 cursor-pointer">
                    <div className="absolute left-0 w-full h-1 bg-white/20 rounded-full overflow-hidden group-hover:h-1.5 transition-all duration-300 backdrop-blur-sm">
                      <div
                        className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                        style={{ width: `${volumePercent}%` }}
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={volume}
                      onChange={handleVolumeChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="hidden md:block h-full w-full rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm border border-white/5 shadow-2xl">
              <LyricDisplay />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullScreenPlayer;
