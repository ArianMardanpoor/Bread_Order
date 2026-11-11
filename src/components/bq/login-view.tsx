"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ChefHat, Loader2, Smartphone, UserRound, Wheat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorBox } from "@/components/bq/common";
import { api, ApiError, setAuth } from "@/lib/api";
import type { BakeryWithStats, Role, User } from "@/lib/types";

export interface LoginResult {
  token: string;
  user: User;
  bakery?: BakeryWithStats;
}

/**
 * صفحه‌ی ورود/ثبت‌نام با شماره موبایل + کد یک‌بارمصرف.
 * کاربر جدید هنگام تایید کد، با نقش انتخابی (مشتری یا نانوا) ثبت‌نام می‌شود.
 */
export function LoginView({ onAuth }: { onAuth: (result: LoginResult) => void }) {
  const [role, setRole] = useState<Role>("customer");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function requestOtp() {
    setError(null);
    const p = phone.trim().replace(/[\s-]/g, "");
    if (!/^09\d{9}$/.test(p)) {
      setError("شماره موبایل معتبر نیست؛ نمونه: 09121234567");
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ message: string; dev_code?: string }>("/auth/request-otp", {
        method: "POST",
        body: { phone: p },
      });
      setPhone(p);
      setDevCode(res.dev_code ?? null);
      setStep("code");
      setCooldown(30);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا در ارسال کد");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setError(null);
    if (code.trim().length < 4) {
      setError("کد تایید را کامل وارد کنید");
      return;
    }
    setBusy(true);
    try {
      const res = await api<LoginResult & { is_new: boolean }>("/auth/verify-otp", {
        method: "POST",
        body: {
          phone,
          code: code.trim(),
          role,
          name: name.trim() || undefined,
        },
      });
      setAuth({ token: res.token, user: res.user });
      onAuth({ token: res.token, user: res.user, bakery: res.bakery });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا در تایید کد");
    } finally {
      setBusy(false);
    }
  }

  const roleTabs: { key: Role; label: string; hint: string; icon: typeof UserRound }[] = [
    { key: "customer", label: "مشتری هستم", hint: "نوبت آنلاین می‌گیرم", icon: UserRound },
    { key: "baker", label: "نانوا هستم", hint: "نانوایی دارم", icon: ChefHat },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-background px-4 py-10">
      <div className="w-full max-w-md">
        {/* برند */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Wheat size={30} aria-hidden />
          </div>
          <h1 className="text-2xl font-bold">نوبت نان</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            بدون ایستادن در صف، در زمان تخمینی برای نون گرم مراجعه کنید
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          {step === "phone" ? (
            <>
              <h2 className="mb-1 font-semibold">ورود یا ثبت‌نام</h2>
              <p className="mb-5 text-sm text-muted-foreground">
                با شماره موبایل وارد شوید؛ کد تایید برایتان ارسال می‌شود.
              </p>

              {/* انتخاب نقش */}
              <Label className="mb-2 block text-sm">نوع حساب</Label>
              <div className="mb-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="نوع حساب">
                {roleTabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="radio"
                    aria-checked={role === t.key}
                    onClick={() => setRole(t.key)}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 p-4 text-center transition-colors ${
                      role === t.key
                        ? "border-primary bg-accent text-accent-foreground"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <t.icon size={22} className={role === t.key ? "text-primary" : "text-muted-foreground"} />
                    <span className="text-sm font-medium">{t.label}</span>
                    <span className="text-xs text-muted-foreground">{t.hint}</span>
                  </button>
                ))}
              </div>

              <Label htmlFor="phone" className="mb-2 block text-sm">
                شماره موبایل
              </Label>
              <div className="relative mb-4">
                <Smartphone size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  dir="ltr"
                  inputMode="numeric"
                  placeholder="09121234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 11))}
                  onKeyDown={(e) => e.key === "Enter" && requestOtp()}
                  className="ltr-nums py-5 text-left pr-10 text-base"
                  autoFocus
                />
              </div>

              <ErrorBox message={error} />

              <Button className="mt-4 w-full py-5 text-base" onClick={requestOtp} disabled={busy}>
                {busy ? <Loader2 size={18} className="animate-spin" /> : "دریافت کد تایید"}
              </Button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setError(null);
                }}
                className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowRight size={16} />
                ویرایش شماره
              </button>

              <h2 className="mb-1 font-semibold">کد تایید را وارد کنید</h2>
              <p className="mb-5 text-sm text-muted-foreground">
                کد ۵ رقمی ارسال‌شده به <span className="ltr-nums font-medium text-foreground">{phone}</span> را وارد کنید.
              </p>

              {devCode && (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  حالت توسعه — کد تایید:{" "}
                  <span className="ltr-nums font-bold tracking-widest">{devCode}</span>
                </div>
              )}

              <Label htmlFor="otp" className="mb-2 block text-sm">
                کد تایید
              </Label>
              <Input
                id="otp"
                dir="ltr"
                inputMode="numeric"
                placeholder="- - - - -"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
                onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
                className="mb-4 py-5 text-center text-2xl font-bold tracking-[0.6em]"
                autoFocus
              />

              {/* نام برای ثبت‌نام */}
              <Label htmlFor="name" className="mb-2 block text-sm">
                نام شما <span className="text-muted-foreground">(برای ثبت‌نام، اختیاری)</span>
              </Label>
              <Input
                id="name"
                placeholder="مثلاً زهرا محمدی"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mb-4"
              />

              <ErrorBox message={error} />

              <Button className="mt-4 w-full py-5 text-base" onClick={verifyOtp} disabled={busy}>
                {busy ? <Loader2 size={18} className="animate-spin" /> : "ورود به نوبت نان"}
              </Button>

              <div className="mt-4 text-center">
                {cooldown > 0 ? (
                  <span className="text-sm text-muted-foreground">
                    ارسال مجدد کد تا <span className="ltr-nums font-medium">{cooldown}</span> ثانیه دیگر
                  </span>
                ) : (
                  <button
                    type="button"
                    className="text-sm font-medium text-primary hover:underline"
                    onClick={requestOtp}
                    disabled={busy}
                  >
                    ارسال مجدد کد
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs leading-6 text-muted-foreground">
          با ورود، شرایط استفاده از «نوبت نان» را می‌پذیرید.
          <br />
          نسخه‌ی اول (MVP) — گرفتن نوبت آنلاین به‌زودی فعال می‌شود.
        </p>
      </div>
    </div>
  );
}
