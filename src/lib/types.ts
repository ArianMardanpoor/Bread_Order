/** تایپ‌های متناسب با پاسخ API بک‌اند */

export type Role = "customer" | "baker";

export type EntryStatus = "waiting" | "ready" | "picked_up" | "cancelled";

export interface User {
  id: number;
  phone: string;
  name: string;
  role: Role;
  created_at: string;
}

export interface Bakery {
  id: number;
  owner_user_id: number;
  name: string;
  address: string;
  working_hours: string;
  production_rate: number | null;
  in_person_queue_estimate: number;
  in_person_queue_updated_at: string | null;
  created_at: string;
}

export interface BakeryStats {
  waiting_count: number;
  breads_waiting: number;
  estimated_wait_minutes: number | null;
  avg_rating: number | null;
  reviews_count: number;
  queue_estimate_stale: boolean;
}

export type BakeryWithStats = Bakery & BakeryStats;

export interface BakeryDetail extends BakeryWithStats {
  bread_types: BreadType[];
}

export interface BreadType {
  id: number;
  bakery_id: number;
  name: string;
  price: number;
}

export interface QueueItem {
  bread_type_id: number;
  name: string;
  qty: number;
  price: number;
}

export interface QueueEntry {
  id: number;
  bakery_id: number;
  customer_user_id: number;
  position: number;
  status: EntryStatus;
  items: QueueItem[];
  total_qty: number;
  estimated_ready_at: string | null;
  created_at: string;
  ready_at: string | null;
  picked_up_at: string | null;
  customer_name?: string;
  customer_phone?: string;
}

export interface Review {
  id: number;
  bakery_id: number;
  rating: number;
  comment: string;
  created_at: string;
  customer_name?: string;
}

export interface ReviewsResponse {
  reviews: Review[];
  avg_rating: number | null;
  count: number;
}

export interface QueueResponse {
  entries: QueueEntry[];
  bakery: BakeryWithStats;
}
