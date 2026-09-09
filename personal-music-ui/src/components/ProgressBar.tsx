"use client";

import { usePlayerStore } from "@/store/usePlayerStore";
import { formatDuration } from "@/lib/utils";
import * as React from "react";
import { useEffect, useRef, useState } from "react";

const ProgressBar = () => {
  const { currentTime, duration, seek } = usePlayerStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) {
      setDragValue(currentTime);
    }
  }, [currentTime, isDragging]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = Math.min(
      Math.max((e.clientX - rect.left) / rect.width, 0),
      1
    );
    seek(percent * duration);
  };

  const updateDrag = (e: MouseEvent | React.MouseEvent) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = Math.min(
      Math.max((e.clientX - rect.left) / rect.width, 0),
      1
    );
    setDragValue(percent * duration);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateDrag(e);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) updateDrag(e);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        setIsDragging(false);
        if (progressBarRef.current && duration) {
          const rect = progressBarRef.current.getBoundingClientRect();
          const percent = Math.min(
            Math.max((e.clientX - rect.left) / rect.width, 0),
            1
          );
          seek(percent * duration);
        }
      }
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, duration, seek]);

  const progressPercent = duration ? (dragValue / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 text-xs font-medium text-[#a7a7a7] w-full select-none group">
      <span className="min-w-[40px] text-right tabular-nums">
        {formatDuration(dragValue)}
      </span>

      <div
        ref={progressBarRef}
        className="relative h-1 flex-1 bg-[#4d4d4d] rounded-full cursor-pointer flex items-center group/bar"
        onMouseDown={handleMouseDown}
        onClick={handleSeek}
      >
        <div
          className="h-full bg-white rounded-full group-hover:bg-[#1db954] transition-colors duration-100"
          style={{ width: `${progressPercent}%` }}
        />
        <div
          className="absolute w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-100 hover:scale-110"
          style={{ left: `${progressPercent}%`, marginLeft: "-6px" }}
        />
      </div>

      <span className="min-w-[40px] tabular-nums">{formatDuration(duration)}</span>
    </div>
  );
};

export default ProgressBar;
