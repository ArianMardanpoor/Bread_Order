"use client";

import { Loader2, Star } from "lucide-react";
import { statusLabel } from "@/lib/format";

/** نمایش امتیاز ۱ تا ۵ با ستاره */
export function Stars({
  value,
  count,
  size = 16,
}: {
  value: number | null | undefined;
  count?: number | null;
  size?: number;
}) {
  if (value === null || value === undefined) {
    return <span className="text-sm text-muted-foreground">بدون امتیاز</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center gap-0.5" aria-label={`امتیاز ${value} از ۵`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            aria-hidden
            className={
              i <= Math.round(value)
                ? "fill-amber-500 text-amber-500"
                : "text-muted-foreground/30"
            }
          />
        ))}
      </span>
      <span className="ltr-nums text-sm font-medium text-foreground">
        {value.toFixed(1)}
      </span>
      {typeof count === "number" && count > 0 && (
        <span className="ltr-nums text-xs text-muted-foreground">({count} نظر)</span>
      )}
    </span>
  );
}

/** نشان وضعیت نوبت */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    waiting: "bg-amber-100 text-amber-900 border-amber-300",
    ready: "bg-green-100 text-green-800 border-green-300",
    picked_up: "bg-muted text-muted-foreground border-border",
    cancelled: "bg-red-100 text-red-700 border-red-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        map[status] ?? "bg-muted text-muted-foreground border-border"
      }`}
    >
      {statusLabel(status)}
    </span>
  );
}

/** جعبه‌ی خطای درون‌فرمی */
export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      {message}
    </div>
  );
}

/** حالت خالی (بدون داده) */
export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-14 text-center">
      <Icon size={40} className="text-muted-foreground/40" />
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

/** بارگذاری کامل صفحه */
export function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 size={32} className="animate-spin text-primary" />
    </div>
  );
}
