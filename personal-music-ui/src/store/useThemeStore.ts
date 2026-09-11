import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "dark" | "light" | "system" | "black" | "modern";

interface ThemeState {
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
    initializeTheme: (initialMode?: ThemeMode) => void;
}

const applyTheme = (mode: ThemeMode) => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    // Remove all possible theme classes/attributes
    root.classList.remove("dark", "light", "black", "modern");
    root.removeAttribute("data-theme");

    if (mode === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        root.classList.add(systemTheme);
        root.setAttribute("data-theme", systemTheme);
    } else {
        root.classList.add(mode);
        root.setAttribute("data-theme", mode);
    }
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            mode: "dark",

            setMode: (mode: ThemeMode) => {
                applyTheme(mode);
                set({ mode });
            },

            toggleTheme: () => {
                const currentMode = get().mode;
                const nextMode = currentMode === "light" ? "dark" : "light";
                applyTheme(nextMode);
                set({ mode: nextMode });
            },

            initializeTheme: (initialMode?: ThemeMode) => {
                const mode = initialMode || get().mode;
                applyTheme(mode);
                set({ mode });

                if (typeof window !== "undefined") {
                    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
                    const handleChange = () => {
                        const currentMode = get().mode;
                        if (currentMode === "system") {
                            applyTheme("system");
                        }
                    };
                    mediaQuery.addEventListener("change", handleChange);
                }
            },
        }),
        {
            name: "theme-storage",
            partialize: (state) => ({ mode: state.mode }),
        }
    )
);
