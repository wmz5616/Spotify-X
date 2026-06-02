"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export default function SplashScreen() {
    const [isVisible, setIsVisible] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);

    const [isExiting, setIsExiting] = useState(false);

    const { contextSafe } = useGSAP({ scope: containerRef });

    // Initial setup
    useGSAP(() => {
        // Position tonearm away from the record initially
        gsap.set(".tonearm", { rotation: -15, transformOrigin: "45px 15px" });

        // Gentle float for the whole player to feel alive
        gsap.to(".player-wrapper", {
            y: -10,
            duration: 3,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    }, { scope: containerRef });

    // Hover: Move tonearm onto the record
    const handleMouseEnter = contextSafe(() => {
        if (isExiting) return;

        gsap.to(".tonearm", {
            rotation: 12,
            duration: 0.6,
            ease: "back.out(1.2)"
        });

        gsap.to(textRef.current, {
            scale: 1.05,
            color: "#1db954",
            duration: 0.3
        });

        // Slight hint of rotation
        gsap.to(".vinyl-record", {
            rotation: "+=15",
            duration: 0.5,
            ease: "power2.out"
        });
    });

    // Leave: Move tonearm back
    const handleMouseLeave = contextSafe(() => {
        if (isExiting) return;

        gsap.to(".tonearm", {
            rotation: -15,
            duration: 0.6,
            ease: "back.out(1.2)"
        });

        gsap.to(textRef.current, {
            scale: 1,
            color: "rgba(255,255,255,0.5)",
            duration: 0.3
        });
    });

    // Click: Play and Transition
    const handleEnter = contextSafe(() => {
        if (isExiting) return;
        setIsExiting(true);

        const tl = gsap.timeline({
            onComplete: () => setIsVisible(false)
        });

        // 1. Move tonearm slightly further in (playing position)
        tl.to(".tonearm", {
            rotation: 20,
            duration: 0.3,
            ease: "power2.out"
        }, 0);

        // 2. Start spinning the record fast
        tl.to(".vinyl-record", {
            rotation: "+=720", // Spin a few times
            duration: 1.5,
            ease: "power2.inOut"
        }, 0);

        // Fade out text and tonearm
        tl.to([textRef.current, ".tonearm"], {
            opacity: 0,
            duration: 0.5,
            ease: "power2.in"
        }, 0.5);

        // 3. The "Tunnel" Transition
        // Scale the vinyl up massively so we "dive" into the center hole
        tl.to(".player-wrapper", {
            scale: 60,
            duration: 1.2,
            ease: "expo.in"
        }, 0.8);

        // As it scales massively, the black hole covers the screen, then we fade it out
        tl.to(containerRef.current, {
            opacity: 0,
            duration: 0.5,
            ease: "power2.inOut"
        }, 1.5);
    });

    if (!isVisible) return null;

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex items-center justify-center overflow-hidden font-sans"
        >
            <div className="flex flex-col items-center">

                {/* Vinyl Player Interactive Area */}
                <div
                    className="player-wrapper relative w-72 h-72 cursor-pointer group mb-12"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleEnter}
                >
                    {/* The Vinyl Record */}
                    <div className="vinyl-record absolute inset-0 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#050505] border-[2px] border-[#222]">
                        {/* Grooves */}
                        <div className="absolute inset-3 border border-white/5 rounded-full" />
                        <div className="absolute inset-7 border border-white/5 rounded-full" />
                        <div className="absolute inset-11 border border-white/5 rounded-full" />
                        <div className="absolute inset-16 border border-white/5 rounded-full" />

                        <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.05)_45deg,transparent_90deg,transparent_180deg,rgba(255,255,255,0.05)_225deg,transparent_270deg)] mix-blend-screen pointer-events-none" />

                        {/* Center Label */}
                        <div className="relative w-24 h-24 bg-gradient-to-br from-[#1db954] to-[#168a3e] rounded-full flex items-center justify-center shadow-inner">
                            {/* Inner ring design */}
                            <div className="absolute inset-1 border border-black/20 rounded-full" />

                            {/* The Center Hole (Black Void) */}
                            <div className="center-hole relative w-5 h-5 bg-[#0a0a0a] rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]" />
                        </div>
                    </div>

                    {/* The Tonearm (Needle) */}
                    <div className="tonearm absolute top-4 -right-8 z-10 pointer-events-none filter drop-shadow-2xl">
                        <svg width="80" height="200" viewBox="0 0 80 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Pivot Base */}
                            <circle cx="45" cy="15" r="14" fill="#333" />
                            <circle cx="45" cy="15" r="10" fill="#222" />
                            <circle cx="45" cy="15" r="4" fill="#111" />

                            {/* Arm Metal Pipe */}
                            <path d="M 45 15 Q 60 70 30 150" stroke="#aaa" strokeWidth="6" strokeLinecap="round" />
                            <path d="M 45 15 Q 60 70 30 150" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />

                            {/* Headstock Base */}
                            <g transform="translate(26, 148) rotate(-20)">
                                <rect x="-10" y="0" width="20" height="35" rx="3" fill="#222" />
                                <rect x="-10" y="10" width="20" height="3" fill="#444" />
                                {/* Needle indicator (Spotify Green) */}
                                <rect x="-3" y="25" width="6" height="6" rx="1" fill="#1db954" />
                            </g>
                        </svg>
                    </div>
                </div>

                {/* Subtitle */}
                <div
                    ref={textRef}
                    className="text-white/50 text-sm tracking-[0.3em] uppercase font-bold transition-colors duration-300"
                >
                    {isExiting ? "Playing..." : "Click to Play"}
                </div>
            </div>

            {/* Film Grain */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }} />
        </div>
    );
}
