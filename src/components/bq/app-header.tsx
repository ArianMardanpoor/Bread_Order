"use client";

import { LogOut, MessageSquare, Settings, Store, Wheat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearAuth } from "@/lib/api";
import type { Role, User } from "@/lib/types";

export type ViewName = "home" | "bakery-detail" | "bakery-settings" | "baker-reviews";

/** سربرگ برنامه با ناوبری وابسته به نقش کاربر */
export function AppHeader({
  user,
  view,
  onNavigate,
  onLogout,
  showBakeryLinks,
}: {
  user: User;
  view: ViewName;
  onNavigate: (v: ViewName) => void;
  onLogout: () => void;
  showBakeryLinks: boolean;
}) {
  const role: Role = user.role;

  const customerLinks: { key: ViewName; label: string; icon: typeof Store }[] = [
    { key: "home", label: "نانوایی‌ها", icon: Store },
  ];
  const bakerLinks: { key: ViewName; label: string; icon: typeof Store; disabled?: boolean }[] = [
    { key: "home", label: "پنل روزانه", icon: Wheat, disabled: !showBakeryLinks },
    { key: "bakery-settings", label: "تنظیمات نانوایی", icon: Settings },
    { key: "baker-reviews", label: "نظرات مشتری‌ها", icon: MessageSquare, disabled: !showBakeryLinks },
  ];
  const links = role === "baker" ? bakerLinks : customerLinks;

  return (
    <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
        {/* برند */}
        <button
          className="flex items-center gap-2 font-bold"
          onClick={() => onNavigate(role === "baker" && !showBakeryLinks ? "bakery-settings" : "home")}
          aria-label="خانه"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wheat size={17} aria-hidden />
          </span>
          <span className="hidden sm:inline">نوبت نان</span>
        </button>

        {/* ناوبری */}
        <nav className="flex flex-1 items-center justify-center gap-1" aria-label="ناوبری اصلی">
          {links.map((l) => (
            <button
              key={l.key}
              onClick={() => !l.disabled && onNavigate(l.key)}
              disabled={l.disabled}
              aria-current={view === l.key ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                l.disabled
                  ? "cursor-not-allowed text-muted-foreground/40"
                  : view === l.key
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <l.icon size={15} aria-hidden />
              <span className="hidden md:inline">{l.label}</span>
            </button>
          ))}
        </nav>

        {/* کاربر + خروج */}
        <div className="flex items-center gap-2">
          <div className="hidden text-left sm:block">
            <p className="max-w-32 truncate text-sm font-medium">{user.name || "کاربر"}</p>
            <p className="ltr-nums text-xs text-muted-foreground">{user.phone}</p>
          </div>
          <span className="rounded-full border border-primary/30 bg-accent px-2 py-0.5 text-xs text-accent-foreground">
            {role === "baker" ? "نانوا" : "مشتری"}
          </span>
          <Button
            size="icon"
            variant="ghost"
            aria-label="خروج از حساب"
            title="خروج از حساب"
            onClick={() => {
              clearAuth();
              onLogout();
            }}
          >
            <LogOut size={17} />
          </Button>
        </div>
      </div>
    </header>
  );
}
