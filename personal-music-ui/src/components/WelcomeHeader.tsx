"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { useUserStore } from "@/store/useUserStore";

const WelcomeHeader = () => {
  const { user } = useUserStore();
  const [greeting, setGreeting] = useState("欢迎");
  const [timeStr, setTimeStr] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const updateTime = () => {
      const now = new Date();
      const hour = now.getHours();
      let greetText = "";

      if (hour >= 5 && hour < 11) {
        greetText = "早上好";
      } else if (hour >= 11 && hour < 13) {
        greetText = "中午好";
      } else if (hour >= 13 && hour < 18) {
        greetText = "下午好";
      } else {
        greetText = "晚上好";
      }

      const userName = user?.displayName || user?.username || "";
      setGreeting(userName ? `${greetText} ${userName}` : greetText);

      const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
      const dayName = days[now.getDay()];

      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");

      setTimeStr(`${dayName}  ${hours}:${minutes}:${seconds}`);
    };

    updateTime();

    const timer = setInterval(updateTime, 1000);

    return () => clearInterval(timer);
  }, [user]);

  if (!mounted) {
    return <div className="hidden md:block h-[88px] mb-8" />;
  }

  return (
    <div className="hidden md:block mb-8 mt-2">
      <motion.h1
        initial={{
          opacity: 0,
          x: -20,
          textShadow: "0 0 0px rgba(255,255,255,0)",
        }}
        animate={{
          opacity: 1,
          x: 0,
          textShadow: [
            "0 0 5px rgba(255,255,255,0.0)",
            "0 0 20px rgba(255,255,255,0.4)",
            "0 0 5px rgba(255,255,255,0.0)",
          ],
        }}
        transition={{
          opacity: { duration: 0.6, ease: "easeOut" },
          x: { duration: 0.6, ease: "easeOut" },
          textShadow: {
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
        className="text-4xl font-bold text-white tracking-tight"
      >
        {greeting}
      </motion.h1>
      <motion.p
        initial={{
          opacity: 0,
          x: -20,
          textShadow: "0 0 0px rgba(255,255,255,0)",
        }}
        animate={{
          opacity: 1,
          x: 0,
          textShadow: [
            "0 0 2px rgba(255,255,255,0.0)",
            "0 0 10px rgba(255,255,255,0.2)",
            "0 0 2px rgba(255,255,255,0.0)",
          ],
        }}
        transition={{
          opacity: { duration: 0.6, delay: 0.2, ease: "easeOut" },
          x: { duration: 0.6, delay: 0.2, ease: "easeOut" },
          textShadow: {
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          },
        }}
        className="text-neutral-400 mt-2 text-lg font-medium tracking-wide tabular-nums"
      >
        {timeStr}
      </motion.p>
    </div>
  );
};

export default WelcomeHeader;
