"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Store,
  Timer,
  Users,
  Wheat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorBox, StatusBadge } from "@/components/bq/common";
import { useToast } from "@/hooks/use-toast";
import { api, ApiError } from "@/lib/api";
import { fmtNumber, fmtWait, relativeFuture, relativePast, timeHM } from "@/lib/format";
import type { BakeryWithStats, QueueEntry, QueueResponse } from "@/lib/types";
import { usePolling } from "@/lib/use-polling";

type FilterKey = "active" | "waiting" | "ready" | "done";

/**
 * پنل اصلی روزانه‌ی نانوا:
 * - به‌روزرسانی سریع صف حضوری با دکمه‌های + / -
 * - ویرایش نرخ تولید
 * - بنر یادآوری اگر صف حضوری بیش از ۱۰ دقیقه به‌روز نشده باشد
 * - لیست نوبت‌های آنلاین با دکمه‌های «آماده شد» و «تحویل داده شد»
 */
export function BakerPanel({
  bakery: initialBakery,
  onBakeryChanged,
}: {
  bakery: BakeryWithStats;
  onBakeryChanged: (b: BakeryWithStats) => void;
}) {
  const { toast } = useToast();
  const { data, error, loading, refresh } = usePolling<QueueResponse>(
    () => api(`/bakeries/${initialBakery.id}/queue`),
    10_000
  );

  const bakery = data?.bakery ?? initialBakery;
  const entries = data?.entries ?? [];

  // نکته: به‌روزرسانی نانوایی در سطح برنامه فقط با عملیات خود کاربر انجام می‌شود
  // (ذخیره‌ی صف حضوری یا نرخ تولید)؛ داده‌ی polling به‌صورت محلی همین‌جا استفاده می‌شود.

  const [filter, setFilter] = useState<FilterKey>("active");
  const filtered = useMemo(() => {
    switch (filter) {
      case "waiting":
        return entries.filter((e) => e.status === "waiting");
      case "ready":
        return entries.filter((e) => e.status === "ready");
      case "done":
        return entries.filter((e) => e.status === "picked_up" || e.status === "cancelled");
      default:
        return entries.filter((e) => e.status === "waiting" || e.status === "ready");
    }
  }, [entries, filter]);

  const counts = useMemo(
    () => ({
      active: entries.filter((e) => e.status === "waiting" || e.status === "ready").length,
      waiting: entries.filter((e) => e.status === "waiting").length,
      ready: entries.filter((e) => e.status === "ready").length,
      done: entries.filter((e) => e.status === "picked_up" || e.status === "cancelled").length,
    }),
    [entries]
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold">پنل روزانه — {bakery.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          وضعیت صف را به‌روز نگه دارید تا مشتری‌ها زمان مراجعه‌ی درستی ببینند.
        </p>
      </div>

      {/* بنر یادآوری به‌روزرسانی صف حضوری */}
      {bakery.queue_estimate_stale && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-3 rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3.5 text-amber-900 shadow-sm"
        >
          <AlertTriangle size={22} className="mt-0.5 shrink-0" aria-hidden />
          <div>
            <p className="font-bold">لطفاً تعداد صف حضوری را به‌روزرسانی کنید</p>
            <p className="mt-0.5 text-sm leading-6">
              آخرین به‌روزرسانی بیش از ۱۰ دقیقه پیش بوده است
              {bakery.in_person_queue_updated_at
                ? ` (${relativePast(bakery.in_person_queue_updated_at)})`
                : " (هنوز به‌روزرسانی نشده)"}
              . تخمین دقیق صف حضوری، زمان مراجعه‌ی مشتری‌های آنلاین را دقیق‌تر می‌کند.
            </p>
          </div>
        </div>
      )}

      {/* آمار کلی */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Users size={15} />} value={fmtNumber(bakery.waiting_count)} label="نوبت آنلاین در صف" />
        <StatCard icon={<Wheat size={15} />} value={fmtNumber(bakery.breads_waiting)} label="نان در صف آنلاین" />
        <StatCard icon={<Store size={15} />} value={fmtNumber(bakery.in_person_queue_estimate)} label="نان صف حضوری" />
        <StatCard
          icon={<Timer size={15} />}
          value={bakery.estimated_wait_minutes !== null ? fmtWait(bakery.estimated_wait_minutes) : "نامشخص"}
          label="انتظار تقریبی کل"
          highlight
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* به‌روزرسانی صف حضوری */}
        <QueueEstimateCard
          bakery={bakery}
          onUpdated={(b) => {
            onBakeryChanged(b);
            refresh();
          }}
        />

        {/* نرخ تولید */}
        <ProductionRateCard
          bakery={bakery}
          onUpdated={(b) => {
            onBakeryChanged(b);
            refresh();
          }}
        />
      </div>

      {/* لیست نوبت‌ها */}
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">نوبت‌های آنلاین</CardTitle>
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="فیلتر نوبت‌ها">
              {(
                [
                  ["active", `در جریان (${counts.active})`],
                  ["waiting", `در انتظار (${counts.waiting})`],
                  ["ready", `آماده (${counts.ready})`],
                  ["done", `پایان‌یافته (${counts.done})`],
                ] as [FilterKey, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={filter === key}
                  onClick={() => setFilter(key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    filter === key
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-6">
          <ErrorBox message={error} />
          {loading && entries.length === 0 ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title="نوبتی در این دسته نیست"
              description="وقتی مشتری‌ها نوبت آنلاین بگیرند، اینجا به ترتیب نمایش داده می‌شوند."
            />
          ) : (
            <ul className="scrolllist grid max-h-[32rem] gap-3 overflow-y-auto pl-1">
              {filtered.map((e) => (
                <QueueEntryRow key={e.id} entry={e} onChanged={refresh} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** کارت به‌روزرسانی صف حضوری با دکمه‌های بزرگ + / - */
function QueueEstimateCard({
  bakery,
  onUpdated,
}: {
  bakery: BakeryWithStats;
  onUpdated: (b: BakeryWithStats) => void;
}) {
  const { toast } = useToast();
  const [value, setValue] = useState(bakery.in_person_queue_estimate);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setValue(bakery.in_person_queue_estimate);
  }, [bakery.in_person_queue_estimate]);

  const dirty = value !== bakery.in_person_queue_estimate;

  async function save() {
    setBusy(true);
    try {
      const updated = await api<BakeryWithStats>(`/bakeries/${bakery.id}/queue-estimate`, {
        method: "PUT",
        body: { in_person_queue_estimate: value },
      });
      toast({ title: "تخمین صف حضوری به‌روزرسانی شد" });
      onUpdated(updated);
    } catch (e) {
      toast({
        title: "خطا در به‌روزرسانی",
        description: e instanceof ApiError ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-primary/25">
      <CardContent className="pb-6">
        <p className="mb-1 text-sm font-semibold">صف حضوری چقدر است؟</p>
        <p className="mb-4 text-xs leading-5 text-muted-foreground">
          تعداد نانِ تقریبی صف فیزیکی فعلی را وارد کنید.
          {bakery.in_person_queue_updated_at
            ? ` آخرین به‌روزرسانی: ${relativePast(bakery.in_person_queue_updated_at)}`
            : " هنوز به‌روزرسانی نشده."}
        </p>

        <div className="flex items-center gap-4">
          <Button
            size="icon"
            aria-label="کاهش ۵ نان"
            className="size-14 shrink-0 rounded-2xl"
            variant="outline"
            onClick={() => setValue((v) => Math.max(0, v - 5))}
            disabled={busy}
          >
            <Minus size={26} />
          </Button>

          <div className="flex-1 text-center">
            <Input
              dir="ltr"
              inputMode="numeric"
              value={String(value)}
              onChange={(e) => setValue(Math.max(0, parseInt(e.target.value.replace(/[^\d]/g, "") || "0", 10)))}
              className="ltr-nums border-0 bg-transparent px-0 text-center text-4xl font-bold text-primary focus-visible:ring-0"
              aria-label="تعداد نان صف حضوری"
            />
            <p className="text-xs text-muted-foreground">نان در صف حضوری</p>
          </div>

          <Button
            size="icon"
            aria-label="افزایش ۵ نان"
            className="size-14 shrink-0 rounded-2xl"
            variant="outline"
            onClick={() => setValue((v) => v + 5)}
            disabled={busy}
          >
            <Plus size={26} />
          </Button>
        </div>

        <Button className="mt-4 w-full py-5 text-base" onClick={save} disabled={busy || !dirty}>
          {busy && <Loader2 size={16} className="animate-spin" />}
          ثبت و به‌روزرسانی تخمین‌ها
        </Button>
      </CardContent>
    </Card>
  );
}

/** کارت ویرایش سریع نرخ تولید */
function ProductionRateCard({
  bakery,
  onUpdated,
}: {
  bakery: BakeryWithStats;
  onUpdated: (b: BakeryWithStats) => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [rate, setRate] = useState(bakery.production_rate != null ? String(bakery.production_rate) : "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRate(bakery.production_rate != null ? String(bakery.production_rate) : "");
  }, [bakery.production_rate]);

  async function save() {
    const r = rate.trim();
    if (!r || !/^\d+$/.test(r) || parseInt(r, 10) < 1) {
      toast({ title: "نرخ تولید باید عددی بزرگ‌تر از صفر باشد", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const updated = await api<BakeryWithStats>(`/bakeries/${bakery.id}`, {
        method: "PUT",
        body: { production_rate: parseInt(r, 10) },
      });
      toast({ title: "نرخ تولید به‌روزرسانی شد" });
      setEditing(false);
      onUpdated(updated);
    } catch (e) {
      toast({
        title: "خطا در به‌روزرسانی",
        description: e instanceof ApiError ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="pb-6">
        <p className="mb-1 text-sm font-semibold">نرخ تولید نان</p>
        <p className="mb-4 text-xs leading-5 text-muted-foreground">
          چند نان در دقیقه از تنور درمی‌آورید؟ این عدد در محاسبه‌ی زمان تخمینی استفاده می‌شود.
        </p>

        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              dir="ltr"
              inputMode="numeric"
              value={rate}
              onChange={(e) => setRate(e.target.value.replace(/[^\d]/g, ""))}
              className="ltr-nums h-12 text-center text-xl font-bold"
              aria-label="نرخ تولید"
              autoFocus
            />
            <span className="shrink-0 text-xs text-muted-foreground">نان در دقیقه</span>
          </div>
        ) : (
          <p className="ltr-nums py-1.5 text-center text-4xl font-bold text-primary">
            {bakery.production_rate != null ? bakery.production_rate : "—"}
            <span className="mr-2 text-sm font-normal text-muted-foreground">نان در دقیقه</span>
          </p>
        )}

        {editing ? (
          <div className="mt-4 flex gap-2">
            <Button className="flex-1" onClick={save} disabled={busy}>
              {busy && <Loader2 size={16} className="animate-spin" />}
              ذخیره
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)} disabled={busy}>
              انصراف
            </Button>
          </div>
        ) : (
          <Button variant="outline" className="mt-4 w-full" onClick={() => setEditing(true)}>
            <Pencil size={15} />
            ویرایش نرخ تولید
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** یک نوبت در لیست نانوا */
function QueueEntryRow({ entry, onChanged }: { entry: QueueEntry; onChanged: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function act(action: "ready" | "picked-up") {
    setBusy(true);
    try {
      await api(`/queue-entries/${entry.id}/${action}`, { method: "PUT" });
      toast({
        title: action === "ready" ? "نوبت آماده اعلام شد" : "نوبت تحویل داده شد",
        description: `نوبت شماره ${entry.position} — ${entry.customer_name || "مشتری"}`,
      });
      onChanged();
    } catch (e) {
      toast({
        title: "خطا در تغییر وضعیت",
        description: e instanceof ApiError ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-lg font-bold text-accent-foreground ltr-nums">
            {entry.position}
          </span>
          <div>
            <p className="font-semibold">{entry.customer_name || "مشتری"}</p>
            <p className="text-xs text-muted-foreground">
              ثبت: {relativePast(entry.created_at)} ({timeHM(entry.created_at)})
            </p>
          </div>
        </div>
        <StatusBadge status={entry.status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {entry.items.map((it, i) => (
          <span key={i} className="rounded-full bg-muted px-2.5 py-1 text-xs">
            {it.name} × <span className="ltr-nums font-semibold">{it.qty}</span>
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          مجموع: <b className="ltr-nums text-foreground">{entry.total_qty}</b> نان
        </span>
        {entry.status === "waiting" && (
          <span>
            تخمین آماده شدن: <b className="text-foreground">{relativeFuture(entry.estimated_ready_at)}</b>
          </span>
        )}
        {entry.status === "ready" && entry.ready_at && (
          <span className="text-green-700">از ساعت {timeHM(entry.ready_at)} آماده است</span>
        )}
        {entry.status === "picked_up" && entry.picked_up_at && (
          <span>تحویل: {timeHM(entry.picked_up_at)}</span>
        )}
      </div>

      {(entry.status === "waiting" || entry.status === "ready") && (
        <div className="mt-3 flex flex-wrap gap-2">
          {entry.status === "waiting" && (
            <Button size="sm" variant="secondary" onClick={() => act("ready")} disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              آماده شد
            </Button>
          )}
          <Button size="sm" onClick={() => act("picked-up")} disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
            تحویل داده شد
          </Button>
        </div>
      )}
    </li>
  );
}

function StatCard({
  icon,
  value,
  label,
  highlight = false,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? "border-primary/40 bg-accent" : "bg-muted/50"}`}>
      <p className={`flex items-center gap-1 text-lg font-bold ${highlight ? "text-primary" : ""}`}>
        {icon}
        <span className="ltr-nums">{value}</span>
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
