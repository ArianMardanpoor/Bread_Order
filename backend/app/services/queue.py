"""منطق صف و محاسبه‌ی زمان تخمینی آماده شدن نوبت‌ها.

فرمول (طبق تعریف پروژه):

    estimated_ready_at(نوبت) = الان
        + (تخمین صف حضوری ÷ نرخ تولید)                ← تخلیه‌ی صف حضوری
        + (مجموع نانِ نوبت‌های آنلاین جلوتر ÷ نرخ تولید)  ← نوبت‌های آنلاین جلوتر

منطق صف حضوری همیشه اولویت دارد: مشتری‌های آنلاین هیچ‌وقت زودتر از
تخمین زمان تخلیه‌ی صف حضوری فعلی سرویس داده نمی‌شوند.

این محاسبه باید هر بار که یکی از این‌ها تغییر کند، برای همه‌ی نوبت‌های
«waiting» همان نانوایی دوباره اجرا شود:
  - in_person_queue_estimate به‌روزرسانی شود
  - production_rate به‌روزرسانی شود
  - نوبت جدیدی اضافه یا حذف/پایان (ready / picked_up / cancelled) شود
"""
from datetime import timedelta
from math import ceil

from sqlalchemy import func

from app.core.utils import utcnow
from app.extensions import db
from app.models.queue_entry import QueueEntry
from app.models.review import Review


def next_position(bakery_id):
    """شماره‌ی نوبت بعدی صف آنلاین نانوایی (بزرگ‌ترین position فعلی + ۱)."""
    last = (
        db.session.query(func.max(QueueEntry.position))
        .filter(QueueEntry.bakery_id == bakery_id)
        .scalar()
    )
    return (last or 0) + 1


def create_queue_entry(bakery, customer, items):
    """ثبت نوبت جدید در صف آنلاین و بازمحاسبه‌ی تخمین‌ها.

    در فاز مشتری، اندپوینت POST /api/bakeries/<id>/queue-entries از همین
    سرویس استفاده می‌کند.
    """
    entry = QueueEntry(
        bakery_id=bakery.id,
        customer_user_id=customer.id,
        items=items,
        status="waiting",
        position=next_position(bakery.id),
    )
    db.session.add(entry)
    db.session.commit()
    recalculate_queue_estimates(bakery)
    return entry


def recalculate_queue_estimates(bakery):
    """بازمحاسبه‌ی estimated_ready_at همه‌ی نوبت‌های waiting این نانوایی.

    باید بعد از هر تغییر در production_rate / صف حضوری / افزودن یا
    پایان دادن به نوبت صدا زده شود.
    """
    entries = (
        QueueEntry.query.filter_by(bakery_id=bakery.id, status="waiting")
        .order_by(QueueEntry.position.asc())
        .all()
    )

    rate = bakery.production_rate
    if not rate or rate <= 0:
        # بدون نرخ تولید نمی‌توان تخمین داد
        for entry in entries:
            entry.estimated_ready_at = None
        db.session.commit()
        return entries

    now = utcnow()
    in_person = bakery.in_person_queue_estimate or 0
    # دقیقه‌هایی که طول می‌کشد تا صف حضوری فعلی تخلیه شود
    minutes_ahead = in_person / float(rate)

    for entry in entries:
        # تخمین این نوبت = الان + تخلیه‌ی صف حضوری + نان‌های نوبت‌های جلوتر
        entry.estimated_ready_at = now + timedelta(minutes=minutes_ahead)
        # نان‌های همین نوبت به صف نوبت‌های بعدی اضافه می‌شود
        minutes_ahead += entry.total_qty / float(rate)

    db.session.commit()
    return entries


def waiting_stats(bakery_id):
    """(تعداد نوبت‌های waiting، مجموع نان‌های آن‌ها) برای یک نانوایی."""
    entries = QueueEntry.query.filter_by(bakery_id=bakery_id, status="waiting").all()
    breads = sum(e.total_qty for e in entries)
    return len(entries), breads


def bakery_stats(bakery):
    """آمار لحظه‌ای نانوایی برای نمایش در لیست/جزئیات/پنل نانوا."""
    waiting_count, breads_waiting = waiting_stats(bakery.id)

    estimated_wait_minutes = None
    if bakery.production_rate and bakery.production_rate > 0:
        total_breads = (bakery.in_person_queue_estimate or 0) + breads_waiting
        estimated_wait_minutes = ceil(total_breads / float(bakery.production_rate))

    avg_rating, reviews_count = (
        db.session.query(func.avg(Review.rating), func.count(Review.id))
        .filter(Review.bakery_id == bakery.id)
        .one()
    )

    stale = bakery.in_person_queue_updated_at is None or (
        (utcnow() - bakery.in_person_queue_updated_at).total_seconds()
        > _stale_threshold()
    )

    return {
        "waiting_count": waiting_count,
        "breads_waiting": breads_waiting,
        "estimated_wait_minutes": estimated_wait_minutes,
        "avg_rating": round(float(avg_rating), 1) if avg_rating is not None else None,
        "reviews_count": int(reviews_count),
        "queue_estimate_stale": stale,
    }


def _stale_threshold():
    from flask import current_app

    return current_app.config.get("QUEUE_STALE_SECONDS", 600)
