"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Clock, MapPin, Search, Store, Timer, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, Stars } from "@/components/bq/common";
import { api } from "@/lib/api";
import { fmtNumber, fmtWait } from "@/lib/format";
import type { BakeryWithStats } from "@/lib/types";
import { usePolling } from "@/lib/use-polling";

/** صفحه‌ی اصلی مشتری: لیست نانوایی‌ها با وضعیت لحظه‌ای صف */
export function BakeriesList({ onOpen }: { onOpen: (id: number) => void }) {
  const [search, setSearch] = useState("");
  const { data, loading, error } = usePolling<{ bakeries: BakeryWithStats[] }>(
    () => api("/bakeries"),
    15_000
  );

  const bakeries = data?.bakeries ?? [];
  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return bakeries;
    return bakeries.filter(
      (b) => b.name.includes(q) || b.address.includes(q)
    );
  }, [bakeries, search]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">نانوایی‌ها</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            وضعیت صف هر نانوایی را ببینید و بدون معطلی نوبت بگیرید
          </p>
        </div>
        <div className="relative sm:w-72">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="جست‌وجوی نام یا آدرس..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
            aria-label="جست‌وجوی نانوایی"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={Store} title="خطا در دریافت نانوایی‌ها" description={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Store}
          title={search ? "نانوایی‌ای پیدا نشد" : "هنوز نانوایی‌ای ثبت نشده است"}
          description={
            search
              ? "عبارت جست‌وجو را تغییر دهید."
              : "به‌محض ثبت‌نام نانواها، لیست نانوایی‌ها اینجا نمایش داده می‌شود."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <Card key={b.id} className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
              <div className="h-2 bg-gradient-to-l from-amber-400 via-amber-500 to-amber-600" aria-hidden />
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="leading-6 font-bold">{b.name}</h2>
                </div>
                <Stars value={b.avg_rating} count={b.reviews_count} />

                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden />
                  <span className="line-clamp-2">{b.address || "آدرس ثبت نشده"}</span>
                </p>
                {b.working_hours && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock size={16} className="shrink-0" aria-hidden />
                    {b.working_hours}
                  </p>
                )}

                <div className="mt-auto grid grid-cols-3 gap-2 rounded-xl bg-muted/60 p-3 text-center">
                  <div>
                    <p className="ltr-nums text-lg font-bold text-foreground">{fmtNumber(b.waiting_count)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">نوبت آنلاین</p>
                  </div>
                  <div>
                    <p className="ltr-nums text-lg font-bold text-foreground">
                      {fmtNumber(b.in_person_queue_estimate)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">نان صف حضوری</p>
                  </div>
                  <div>
                    <p className="flex items-center justify-center gap-1 text-sm font-bold text-primary">
                      <Timer size={14} aria-hidden />
                      {b.estimated_wait_minutes !== null ? fmtWait(b.estimated_wait_minutes) : "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">انتظار تقریبی</p>
                  </div>
                </div>

                <Button className="w-full" onClick={() => onOpen(b.id)}>
                  مشاهده و گرفتن نوبت
                  <ArrowLeft size={16} aria-hidden />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Users size={13} aria-hidden />
        اطلاعات صف هر ۱۵ ثانیه به‌روزرسانی می‌شود
      </p>
    </div>
  );
}
