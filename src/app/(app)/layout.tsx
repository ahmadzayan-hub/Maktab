"use client";
import { useState } from "react";
import { ProfileProvider } from "@/components/profile/ProfileProvider";
import { journeyCopy } from "@/lib/journey/copy";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { ToastProvider } from "@/components/ui/Toast";
import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProfileProvider><ToastProvider>
      {/* Animated background mesh */}
      <div className="bg-mesh" aria-hidden>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>

      <div className="app-layout relative z-10">
        <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="app-main">
          <AppHeader onMenuClick={() => setSidebarOpen(true)} />
          <main
            id="main"
            className="flex-1 px-4 sm:px-6 py-6 max-w-7xl w-full mx-auto"
          >
            {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && <p role="status" className="mb-4 rounded-xl border border-amber-300 p-3 text-sm">{journeyCopy[locale].demo}</p>}
            <div>
              {children}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider></ProfileProvider>
  );
}
