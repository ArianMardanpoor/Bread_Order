"use client";

import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, Stars } from "@/components/bq/common";
import { api } from "@/lib/api";
import { relativePast } from "@/lib/format";
import type { BakeryWithStats, ReviewsResponse } from "@/lib/types";
import { usePolling } from "@/lib/use-polling";

/** صفحه‌ی مشاهده‌ی نظرات مشتری‌ها توسط نانوا */
export function BakerReviews({ bakery }: { bakery: BakeryWithStats }) {
  const { data, loading } = usePolling<ReviewsResponse>(
    () => api(`/bakeries/${bakery.id}/reviews`),
    30_000
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold">نظرات مشتری‌ها</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          بازخورد مشتری‌ها درباره‌ی {bakery.name}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-3 text-base">
            <MessageSquare size={18} className="text-primary" aria-hidden />
            <Stars value={data?.avg_rating ?? null} count={data?.count ?? 0} />
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          {loading && !data ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          ) : !data || data.reviews.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="هنوز نظری ثبت نشده"
              description="پس از تحویل نوبت‌ها، مشتری‌ها می‌توانند نظر دهند."
            />
          ) : (
            <ul className="scrolllist max-h-[36rem] space-y-4 overflow-y-auto pl-1">
              {data.reviews.map((r) => (
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
