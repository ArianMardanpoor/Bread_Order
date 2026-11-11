"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { AppHeader, type ViewName } from "@/components/bq/app-header";
import { LoginView, type LoginResult } from "@/components/bq/login-view";
import { BakeriesList } from "@/components/bq/bakeries-list";
import { BakeryDetail } from "@/components/bq/bakery-detail";
import { BakeryForm } from "@/components/bq/bakery-form";
import { BreadTypesManager } from "@/components/bq/bread-types-manager";
import { BakerPanel } from "@/components/bq/baker-panel";
import { BakerReviews } from "@/components/bq/baker-reviews";
import { PageLoader } from "@/components/bq/common";
import { api, clearAuth, getAuth, setAuth, type AuthState } from "@/lib/api";
import type { BakeryDetail, BakeryWithStats } from "@/lib/types";

type View =
  | { name: "home" }
  | { name: "bakery-detail"; id: number }
  | { name: "bakery-settings" }
  | { name: "baker-reviews" };

export default function Page() {
  const [booting, setBooting] = useState(true);
  const [auth, setAuthState] = useState<AuthState | null>(null);
  const [bakery, setBakery] = useState<BakeryWithStats | null>(null);
  const [view, setView] = useState<View>({ name: "home" });
  const { toast } = useToast();

  const logout = useCallback(() => {
    clearAuth();
    setAuthState(null);
    setBakery(null);
    setView({ name: "home" });
  }, []);

  // بازیابی نشست پس از refresh صفحه
  useEffect(() => {
    const stored = getAuth();
    if (!stored) {
      setBooting(false);
      return;
    }
    api<{ user: AuthState["user"]; bakery?: BakeryWithStats }>("/auth/me")
      .then((res) => {
        setAuthState({ token: stored.token, user: res.user });
        setBakery(res.bakery ?? null);
        if (res.user.role === "baker" && !res.bakery) {
          setView({ name: "bakery-settings" });
        }
      })
      .catch(() => {
        // توکن نامعتبر بوده و درون api پاک شده است
        setAuthState(null);
      })
      .finally(() => setBooting(false));
  }, []);

  // خروج خودکار در صورت 401
  useEffect(() => {
    const handler = () => {
      logout();
      toast({
        title: "نشست شما منقضی شد",
        description: "لطفاً دوباره با شماره موبایل خود وارد شوید.",
        variant: "destructive",
      });
    };
    window.addEventListener("bq-unauthorized", handler);
    return () => window.removeEventListener("bq-unauthorized", handler);
  }, [logout, toast]);

  function handleLogin(result: LoginResult) {
    setAuthState({ token: result.token, user: result.user });
    setBakery(result.bakery ?? null);
    setView({ name: "home" });
  }

  function navigate(v: ViewName) {
    setView({ name: v } as View);
  }

  if (booting) return <PageLoader />;

  if (!auth) {
    return <LoginView onAuth={handleLogin} />;
  }

  const isCustomer = auth.user.role === "customer";

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader
        user={auth.user}
        view={view.name}
        onNavigate={navigate}
        onLogout={logout}
        showBakeryLinks={!!bakery}
      />

      <main className="flex-1">
        {isCustomer ? (
          view.name === "bakery-detail" && "id" in view ? (
            <BakeryDetail key={view.id} id={view.id} onBack={() => setView({ name: "home" })} />
          ) : (
            <BakeriesList onOpen={(id) => setView({ name: "bakery-detail", id })} />
          )
        ) : view.name === "baker-reviews" && bakery ? (
          <BakerReviews bakery={bakery} />
        ) : view.name === "bakery-settings" || !bakery ? (
          <BakerySettings
            bakery={bakery}
            onSaved={(b) => {
              setBakery(b);
              setView({ name: "home" });
            }}
          />
        ) : (
          <BakerPanel bakery={bakery} onBakeryChanged={setBakery} />
        )}
      </main>

      <footer className="mt-auto border-t bg-card py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <p className="text-center text-xs text-muted-foreground">
          نوبت نان — نسخه‌ی اول (MVP) · بدون صف، نون گرم بگیرید
        </p>
      </footer>
    </div>
  );
}

/** نمای تنظیمات نانوایی: ویرایش اطلاعات + مدیریت انواع نون */
function BakerySettings({
  bakery,
  onSaved,
}: {
  bakery: BakeryWithStats | null;
  onSaved: (b: BakeryWithStats) => void;
}) {
  const [detail, setDetail] = useState<BakeryDetail | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!bakery) return;
    let alive = true;
    api<BakeryDetail>(`/bakeries/${bakery.id}`)
      .then((d) => {
        if (alive) setDetail(d);
      })
      .catch(() => {
        if (alive) setDetail(null);
      });
    return () => {
      alive = false;
    };
  }, [bakery, reloadKey]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-xl font-bold">{bakery ? "تنظیمات نانوایی" : "ثبت نانوایی"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {bakery
            ? "اطلاعات نانوایی و منوی نون‌های خود را مدیریت کنید."
            : "برای فعال شدن پنل روزانه، اول نانوایی خود را ثبت کنید."}
        </p>
      </div>

      <BakeryForm
        bakery={bakery}
        onSaved={(b) => {
          setDetail((d) => (d ? { ...d, ...b } : d));
          onSaved(b);
        }}
      />

      {bakery && (
        <BreadTypesManager
          bakeryId={bakery.id}
          breadTypes={detail?.bread_types ?? []}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
