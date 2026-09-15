"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";

export default function AppInitializer({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { isAuthenticated, token, hasHydrated } = useUserStore();
    const { initializeFavorites, isInitialized } = useFavoritesStore();

    useEffect(() => {
        if (hasHydrated) {
            initializeFavorites();
        }
    }, [hasHydrated, isAuthenticated, token, initializeFavorites]);

    // Global redirect when logged out
    useEffect(() => {
        if (hasHydrated && !isAuthenticated) {
            // Optional: You could redirect here, but page-level guard is more precise.
            // For now, let's keep it in the specific pages that need it.
        }
    }, [hasHydrated, isAuthenticated, router]);

    return <>{children}</>;
}
