"use client";

/**
 * کلاینت API بک‌اند Flask.
 *
 * درخواست‌ها با مسیر نسبی به گیت‌وی سندباکس می‌روند و پورت بک‌اند (۵۰۰۱)
 * با پارامتر XTransformPort مشخص می‌شود؛ در اجرای محلی هم همین ساختار کار
 * می‌کند یا می‌توانید از rewrite در next.config استفاده کنید.
 */
import type { User } from "./types";

const API_PORT = 5001;
const AUTH_KEY = "bq_auth";

export interface AuthState {
  token: string;
  user: User;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getAuth(): AuthState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

export function setAuth(auth: AuthState) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown } = {}
): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `/api${path}${sep}XTransformPort=${API_PORT}`;

  const headers: Record<string, string> = {};
  const auth = getAuth();
  if (auth) headers.Authorization = `Bearer ${auth.token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید", 0);
  }

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    // بدنه‌ی خالی
  }

  if (!res.ok) {
    if (res.status === 401 && auth) {
      clearAuth();
      window.dispatchEvent(new Event("bq-unauthorized"));
    }
    throw new ApiError(
      (data.error as string) || "خطای غیرمنتظره‌ای رخ داد",
      res.status
    );
  }
  return data as T;
}
