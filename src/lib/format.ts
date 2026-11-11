/** قالب‌بندی اعداد، قیمت و زمان — اعداد با ارقام انگلیسی برای وضوح بیشتر */

export function fmtNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US");
}

export function fmtPrice(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${n.toLocaleString("en-US")} تومان`;
}

export function fmtWait(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "نامشخص";
  if (minutes <= 0) return "بدون انتظار";
  if (minutes < 60) return `حدود ${minutes} دقیقه`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `حدود ${h} ساعت و ${m} دقیقه` : `حدود ${h} ساعت`;
}

/** «۲۵ دقیقه دیگر» / «۱ ساعت و ۵ دقیقه دیگر» / «الان آماده است» */
export function relativeFuture(iso: string | null | undefined): string {
  if (!iso) return "نامشخص";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "الان آماده است";
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} دقیقه دیگر`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h} ساعت و ${m} دقیقه دیگر` : `${h} ساعت دیگر`;
}

/** «۳ دقیقه پیش» / «۲ روز پیش» */
export function relativePast(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "همین حالا";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min} دقیقه پیش`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ساعت پیش`;
  const d = Math.floor(h / 24);
  return `${d} روز پیش`;
}

/** نمایش ساعت به وقت تهران با ارقام انگلیسی، مثل 14:05 */
export function timeHM(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR-u-nu-latn", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tehran",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export const STATUS_LABELS: Record<string, string> = {
  waiting: "در انتظار",
  ready: "آماده شد",
  picked_up: "تحویل داده شد",
  cancelled: "لغو شده",
};

export function statusLabel(s: string): string {
  return STATUS_LABELS[s] ?? s;
}
