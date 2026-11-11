"""اندپوینت‌های نانوایی.

عمومی (بدون لاگین):
    GET  /api/bakeries                  لیست نانوایی‌ها با وضعیت صف
    GET  /api/bakeries/<id>             جزئیات + انواع نون + وضعیت صف
    GET  /api/bakeries/<id>/reviews     نظرات مشتری‌ها

نانوا (لاگین با role=baker):
    POST /api/bakeries                  ثبت نانوایی جدید
    PUT  /api/bakeries/<id>             ویرایش اطلاعات و نرخ تولید
    PUT  /api/bakeries/<id>/queue-estimate   به‌روزرسانی تخمین صف حضوری
    GET  /api/bakeries/<id>/queue       لیست نوبت‌های آنلاین به ترتیب
"""
from flask import g, jsonify

from app.api import api_bp
from app.core.auth import role_required
from app.core.errors import ApiError
from app.core.utils import iso, utcnow
from app.core.validators import (
    as_int,
    get_json_body,
    optional_str,
    require_str,
)
from app.extensions import db
from app.models.bakery import Bakery
from app.models.bread_type import BreadType
from app.models.queue_entry import QueueEntry
from app.models.review import Review
from app.services.queue import bakery_stats, recalculate_queue_estimates


def _get_bakery_or_404(bakery_id):
    bakery = db.session.get(Bakery, bakery_id)
    if bakery is None:
        raise ApiError("نانوایی مورد نظر یافت نشد", 404)
    return bakery


def _get_owned_bakery(bakery_id):
    """نانوایی را برمی‌گرداند فقط اگر متعلق به نانوای لاگین‌شده باشد."""
    bakery = _get_bakery_or_404(bakery_id)
    if bakery.owner_user_id != g.current_user.id:
        raise ApiError("این نانوایی متعلق به شما نیست", 403)
    return bakery


def _serialize_bakery(bakery, with_stats=True):
    data = bakery.to_dict()
    if with_stats:
        data.update(bakery_stats(bakery))
    return data


# ─────────────────────────── عمومی ───────────────────────────


@api_bp.route("/bakeries", methods=["GET"])
def list_bakeries():
    bakeries = Bakery.query.order_by(Bakery.created_at.asc()).all()
    return jsonify({"bakeries": [_serialize_bakery(b) for b in bakeries]})


@api_bp.route("/bakeries/<int:bakery_id>", methods=["GET"])
def get_bakery(bakery_id):
    bakery = _get_bakery_or_404(bakery_id)
    data = _serialize_bakery(bakery)
    data["bread_types"] = [bt.to_dict() for bt in bakery.bread_types]
    return jsonify(data)


@api_bp.route("/bakeries/<int:bakery_id>/reviews", methods=["GET"])
def bakery_reviews(bakery_id):
    bakery = _get_bakery_or_404(bakery_id)
    reviews = (
        Review.query.filter_by(bakery_id=bakery.id)
        .order_by(Review.created_at.desc())
        .limit(100)
        .all()
    )
    stats = bakery_stats(bakery)
    return jsonify(
        {
            "reviews": [r.to_dict(include_customer=True) for r in reviews],
            "avg_rating": stats["avg_rating"],
            "count": stats["reviews_count"],
        }
    )


# ─────────────────────────── نانوا ───────────────────────────


@api_bp.route("/bakeries", methods=["POST"])
@role_required("baker")
def create_bakery():
    # هر نانوا فقط یک نانوایی ثبت می‌کند
    if g.current_user.bakery is not None:
        raise ApiError("شما قبلاً نانوایی خود را ثبت کرده‌اید", 409)

    data = get_json_body()
    name = require_str(data.get("name"), "نام نانوایی", max_len=120)
    address = optional_str(data.get("address"), "آدرس", max_len=300)
    working_hours = optional_str(data.get("working_hours"), "ساعت کاری", max_len=200)
    production_rate = as_int(
        data.get("production_rate"), "نرخ تولید (تعداد نان در دقیقه)", min_val=1
    )
    # تخمین اولیه‌ی صف حضوری اختیاری است
    in_person = as_int(data.get("in_person_queue_estimate"), "تعداد صف حضوری", min_val=0)

    bakery = Bakery(
        owner_user_id=g.current_user.id,
        name=name,
        address=address,
        working_hours=working_hours,
        production_rate=production_rate,
        in_person_queue_estimate=in_person or 0,
        # اگر تخمین صف حضوری داده شده باشد، زمان به‌روزرسانی هم ثبت می‌شود؛
        # وگرنه None می‌ماند تا بنر «لطفاً به‌روزرسانی کنید» نمایش داده شود.
        in_person_queue_updated_at=utcnow() if data.get("in_person_queue_estimate") is not None else None,
        created_at=utcnow(),
    )
    db.session.add(bakery)
    db.session.commit()
    return jsonify(_serialize_bakery(bakery)), 201


@api_bp.route("/bakeries/<int:bakery_id>", methods=["PUT"])
@role_required("baker")
def update_bakery(bakery_id):
    bakery = _get_owned_bakery(bakery_id)
    data = get_json_body()

    rate_changed = False
    if "name" in data:
        bakery.name = require_str(data.get("name"), "نام نانوایی", max_len=120)
    if "address" in data:
        bakery.address = optional_str(data.get("address"), "آدرس", max_len=300)
    if "working_hours" in data:
        bakery.working_hours = optional_str(data.get("working_hours"), "ساعت کاری", max_len=200)
    if data.get("production_rate") is not None:
        new_rate = as_int(
            data.get("production_rate"), "نرخ تولید (تعداد نان در دقیقه)", min_val=1
        )
        rate_changed = new_rate != bakery.production_rate
        bakery.production_rate = new_rate

    db.session.commit()
    if rate_changed:
        # تغییر نرخ تولید → بازمحاسبه‌ی تخمین همه‌ی نوبت‌های در انتظار
        recalculate_queue_estimates(bakery)
    return jsonify(_serialize_bakery(bakery))


@api_bp.route("/bakeries/<int:bakery_id>/queue-estimate", methods=["PUT"])
@role_required("baker")
def update_queue_estimate(bakery_id):
    bakery = _get_owned_bakery(bakery_id)
    data = get_json_body()
    if data.get("in_person_queue_estimate") is None:
        raise ApiError("تعداد صف حضوری (تعداد نان) را وارد کنید")

    value = as_int(data.get("in_person_queue_estimate"), "تعداد صف حضوری", min_val=0)
    bakery.in_person_queue_estimate = value or 0
    bakery.in_person_queue_updated_at = utcnow()
    db.session.commit()

    # مهم: با هر تغییر صف حضوری، تخمین همه‌ی نوبت‌های waiting دوباره محاسبه می‌شود
    recalculate_queue_estimates(bakery)
    return jsonify(_serialize_bakery(bakery))


@api_bp.route("/bakeries/<int:bakery_id>/queue", methods=["GET"])
@role_required("baker")
def bakery_queue(bakery_id):
    bakery = _get_owned_bakery(bakery_id)
    # آخرین ۱۰۰ نوبت به ترتیب شماره‌ی نوبت
    entries = (
        QueueEntry.query.filter_by(bakery_id=bakery.id)
        .order_by(QueueEntry.position.desc())
        .limit(100)
        .all()
    )
    entries.reverse()
    return jsonify(
        {
            "entries": [e.to_dict(include_customer=True) for e in entries],
            "bakery": _serialize_bakery(bakery),
        }
    )
