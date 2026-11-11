"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, Wheat, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ErrorBox } from "@/components/bq/common";
import { useToast } from "@/hooks/use-toast";
import { api, ApiError } from "@/lib/api";
import { fmtPrice } from "@/lib/format";
import type { BreadType } from "@/lib/types";

/** مدیریت انواع نون و قیمت‌ها (فقط نانوا) */
export function BreadTypesManager({
  bakeryId,
  breadTypes,
  onChanged,
}: {
  bakeryId: number;
  breadTypes: BreadType[];
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | "new" | null>(null);

  // ویرایش درون‌خطی
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  async function addBreadType() {
    setError(null);
    if (!newName.trim()) {
      setError("نام نوع نون را وارد کنید");
      return;
    }
    const price = newPrice.trim();
    if (price && !/^\d+$/.test(price)) {
      setError("قیمت باید عدد باشد (تومان)");
      return;
    }
    setBusyId("new");
    try {
      await api(`/bakeries/${bakeryId}/bread-types`, {
        method: "POST",
        body: { name: newName.trim(), price: price ? parseInt(price, 10) : 0 },
      });
      setNewName("");
      setNewPrice("");
      toast({ title: "نوع نون جدید اضافه شد" });
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا در افزودن");
    } finally {
      setBusyId(null);
    }
  }

  async function saveEdit(id: number) {
    setError(null);
    if (!editName.trim()) {
      setError("نام نوع نون را وارد کنید");
      return;
    }
    setBusyId(id);
    try {
      await api(`/bread-types/${id}`, {
        method: "PUT",
        body: {
          name: editName.trim(),
          price: editPrice.trim() ? parseInt(editPrice.trim(), 10) : 0,
        },
      });
      setEditingId(null);
      toast({ title: "تغییرات ذخیره شد" });
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا در ذخیره‌سازی");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: number) {
    setBusyId(id);
    try {
      await api(`/bread-types/${id}`, { method: "DELETE" });
      toast({ title: "نوع نون حذف شد" });
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا در حذف");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wheat size={18} className="text-primary" aria-hidden />
          انواع نون و قیمت‌ها
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-6">
        {/* افزودن */}
        <div className="mb-5 grid gap-2 sm:grid-cols-[1fr_150px_auto]">
          <Input
            placeholder="نام نوع نون (مثلاً سنگک)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            aria-label="نام نوع نون جدید"
          />
          <Input
            dir="ltr"
            inputMode="numeric"
            placeholder="قیمت (تومان)"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value.replace(/[^\d]/g, ""))}
            className="ltr-nums text-left"
            aria-label="قیمت نوع نون جدید"
          />
          <Button onClick={addBreadType} disabled={busyId === "new"}>
            {busyId === "new" ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            افزودن
          </Button>
        </div>

        <ErrorBox message={error} />

        {/* لیست */}
        {breadTypes.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            هنوز نوع نونی ثبت نشده است؛ اولین نوع نون را اضافه کنید.
          </p>
        ) : (
          <ul className="scrolllist max-h-96 overflow-y-auto pl-1">
            {breadTypes.map((bt, i) => (
              <li key={bt.id}>
                {i > 0 && <Separator className="my-0.5" />}
                {editingId === bt.id ? (
                  <div className="flex flex-wrap items-center gap-2 py-2.5">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="min-w-32 flex-1"
                      aria-label="نام نوع نون"
                      autoFocus
                    />
                    <Input
                      dir="ltr"
                      inputMode="numeric"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value.replace(/[^\d]/g, ""))}
                      className="ltr-nums w-32 text-left"
                      aria-label="قیمت"
                    />
                    <Button size="sm" onClick={() => saveEdit(bt.id)} disabled={busyId === bt.id}>
                      {busyId === bt.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      ذخیره
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-2.5">
                    <span className="font-medium">{bt.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="ltr-nums mr-2 text-sm font-semibold text-primary">
                        {fmtPrice(bt.price)}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`ویرایش ${bt.name}`}
                        onClick={() => {
                          setEditingId(bt.id);
                          setEditName(bt.name);
                          setEditPrice(String(bt.price));
                        }}
                      >
                        <Pencil size={15} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        aria-label={`حذف ${bt.name}`}
                        onClick={() => remove(bt.id)}
                        disabled={busyId === bt.id}
                      >
                        {busyId === bt.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
