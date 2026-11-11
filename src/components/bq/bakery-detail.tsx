"use client";

import { ArrowRight, Clock, MapPin, MessageSquare, Store, Timer, Users, Wheat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorBox, Stars } from "@/components/bq/common";
import { api } from "@/lib/api";
import { fmtNumber, fmtPrice, fmtWait, relativePast } from "@/lib/format";
import type { BakeryDetail, ReviewsResponse } from "@/lib/types";
import { useEffect, useState } from "react";

/** صفحه‌ی جزئیات نانوایی برای مشتری: انواع نون، وضعیت صف و نظرات */
export function BakeryDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const [detail, setDetail] = useState<BakeryDetail | null>(null);
  const [reviews, setReviews] = useState<ReviewsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api<BakeryDetail>(`/bakeries/${id}`),
      api<ReviewsResponse>(`/bakeries/${id}/reviews`),
    ])
      .then(([d, r]) => {
        if (!alive) return;
        setDetail(d);
        setReviews(r);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : "خطا");
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <ErrorBox message={error} />
        <Button variant="ghost" className="mt-4" onClick={onBack}>
          <ArrowRight size={16} /> بازگشت
        </Button>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <Button variant="ghost" size="sm" className="mb-4" onClick={onBack}>
        <ArrowRight size={16} /> بازگشت به نانوایی‌ها
      </Button>

      {/* سربرگ نانوایی */}
      <Card className="mb-4 overflow-hidden">
        <div className="h-2.5 bg-gradient-to-l from-amber-400 via-amber-500 to-amber-600" aria-hidden />
        <CardContent className="p-6">
          <h1 className="text-xl font-bold">{detail.name}</h1>
          <div className="mt-2">
            <Stars value={detail.avg_rating} count={detail.reviews_count} />
          </div>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden />
              {detail.address || "آدرس ثبت نشده"}
            </p>
            <p className="flex items-center gap-2">
              <Clock size={16} className="shrink-0" aria-hidden />
              {detail.working_hours || "ساعت کاری ثبت نشده"}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox icon={<Users size={15} />} value={fmtNumber(detail.waiting_count)} label="نوبت آنلاین در صف" />
            <StatBox icon={<Wheat size={15} />} value={fmtNumber(detail.breads_waiting)} label="نان در صف آنلاین" />
            <StatBox icon={<Store size={15} />} value={fmtNumber(detail.in_person_queue_estimate)} label="نان صف حضوری" />
            <StatBox
              icon={<Timer size={15} />}
              value={detail.estimated_wait_minutes !== null ? fmtWait(detail.estimated_wait_minutes) : "نامشخص"}
              label="انتظار تقریبی صف"
              highlight
            />
          </div>
        </CardContent>
      </Card>

      {/* انواع نون */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wheat size={18} className="text-primary" aria-hidden />
            انواع نون و قیمت
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          {detail.bread_types.length === 0 ? (
            <p className="text-sm text-muted-foreground">هنوز نوع نونی ثبت نشده است.</p>
          ) : (
            <ul>
              {detail.bread_types.map((bt, i) => (
                <li key={bt.id}>
                  {i > 0 && <Separator className="my-1" />}
                  <div className="flex items-center justify-between py-2.5">
                    <span className="font-medium">{bt.name}</span>
                    <span className="ltr-nums text-sm font-semibold text-primary">{fmtPrice(bt.price)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Button size="lg" className="mt-5 w-full" disabled title="در فاز بعدی فعال می‌شود">
            گرفتن نوبت آنلاین (به‌زودی)
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            گرفتن نوبت و پیگیری زنده‌ی آن در فاز بعدی فعال می‌شود.
          </p>
        </CardContent>
      </Card>

      {/* نظرات */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare size={18} className="text-primary" aria-hidden />
            نظرات مشتری‌ها
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          {!reviews || reviews.reviews.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="هنوز نظری ثبت نشده"
              description="پس از تحویل نوبت، مشتری‌ها می‌توانند امتیاز و نظر خود را ثبت کنند."
            />
          ) : (
            <ul className="space-y-4">
              {reviews.reviews.map((r) => (
                <li key={r.id} className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{r.customer_name || "مشتری"}</span>
                    <span className="text-xs text-muted-foreground">{relativePast(r.created_at)}</span>
                  </div>
                  <div className="mt-1.5">
                    <Stars value={r.rating} size={14} />
                  </div>
                  {r.comment && <p className="mt-2 text-sm leading-6 text-foreground/90">{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({
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
    <div className={`rounded-xl border p-3 text-center ${highlight ? "border-primary/40 bg-accent" : "bg-muted/50"}`}>
      <p className={`flex items-center justify-center gap-1 text-base font-bold ${highlight ? "text-primary" : ""}`}>
        {icon}
        <span className="ltr-nums">{value}</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
