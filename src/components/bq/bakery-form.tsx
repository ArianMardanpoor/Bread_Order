"use client";

import { useState } from "react";
import { Loader2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorBox } from "@/components/bq/common";
import { useToast } from "@/hooks/use-toast";
import { api, ApiError } from "@/lib/api";
import type { BakeryWithStats } from "@/lib/types";

/** فرم ثبت نانوایی جدید (حالت create) یا ویرایش اطلاعات (حالت edit) */
export function BakeryForm({
  bakery,
  onSaved,
  onCancel,
}: {
  bakery?: BakeryWithStats | null;
  onSaved: (bakery: BakeryWithStats) => void;
  onCancel?: () => void;
}) {
  const isEdit = !!bakery;
  const { toast } = useToast();

  const [name, setName] = useState(bakery?.name ?? "");
  const [address, setAddress] = useState(bakery?.address ?? "");
  const [workingHours, setWorkingHours] = useState(bakery?.working_hours ?? "");
  const [productionRate, setProductionRate] = useState(
    bakery?.production_rate != null ? String(bakery.production_rate) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError("نام نانوایی الزامی است");
      return;
    }
    const rate = productionRate.trim();
    if (rate && (!/^\d+$/.test(rate) || parseInt(rate, 10) < 1)) {
      setError("نرخ تولید باید عددی بزرگ‌تر از صفر باشد (نوان در دقیقه)");
      return;
    }
    setBusy(true);
    try {
      const body = {
        name: name.trim(),
        address: address.trim(),
        working_hours: workingHours.trim(),
        production_rate: rate ? parseInt(rate, 10) : undefined,
      };
      const saved = isEdit
        ? await api<BakeryWithStats>(`/bakeries/${bakery!.id}`, { method: "PUT", body })
        : await api<BakeryWithStats>("/bakeries", { method: "POST", body });
      toast({
        title: isEdit ? "اطلاعات نانوایی به‌روزرسانی شد" : "نانوایی شما ثبت شد",
        description: "حالا می‌توانید انواع نون و صف روزانه را مدیریت کنید.",
      });
      onSaved(saved);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا در ذخیره‌سازی");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Store size={18} className="text-primary" aria-hidden />
          {isEdit ? "ویرایش اطلاعات نانوایی" : "ثبت نانوایی"}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-6">
        {!isEdit && (
          <p className="mb-5 rounded-lg bg-muted/60 px-4 py-3 text-sm leading-6 text-muted-foreground">
            برای شروع، اطلاعات نانوایی خود را ثبت کنید؛ بعد از آن پنل مدیریت صف و انواع نون در
            اختیارتان قرار می‌گیرد.
          </p>
        )}

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="bakery-name">نام نانوایی *</Label>
            <Input
              id="bakery-name"
              placeholder="مثلاً نانوایی سنگک برادران"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bakery-address">آدرس</Label>
            <Input
              id="bakery-address"
              placeholder="مثلاً تهران، خیابان انقلاب، پلاک ۱۲"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bakery-hours">ساعت کاری</Label>
            <Input
              id="bakery-hours"
              placeholder="مثلاً صبح ۶ تا ۱۰ و عصر ۱۶ تا ۲۰"
              value={workingHours}
              onChange={(e) => setWorkingHours(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bakery-rate">نرخ تولید (تعداد نان در دقیقه)</Label>
            <Input
              id="bakery-rate"
              dir="ltr"
              inputMode="numeric"
              placeholder="مثلاً 2"
              value={productionRate}
              onChange={(e) => setProductionRate(e.target.value.replace(/[^\d]/g, ""))}
              className="ltr-nums text-left"
            />
            <p className="text-xs leading-5 text-muted-foreground">
              این عدد در محاسبه‌ی زمان تخمینی آماده شدن نوبت‌ها استفاده می‌شود.
            </p>
          </div>

          <ErrorBox message={error} />

          <div className="flex gap-2">
            <Button onClick={submit} disabled={busy} className="flex-1">
              {busy && <Loader2 size={16} className="animate-spin" />}
              {isEdit ? "ذخیره‌ی تغییرات" : "ثبت نانوایی"}
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel} disabled={busy}>
                انصراف
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
