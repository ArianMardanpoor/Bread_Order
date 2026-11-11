"""عملیات نانوا روی نوبت‌های صف آنلاین.

    PUT /api/queue-entries/<id>/ready       علامت «آماده شد»
    PUT /api/queue-entries/<id>/picked-up   علامت «تحویل داده شد»

گرفتن نوبت توسط مشتری (POST /api/bakeries/<id>/queue-entries) و وضعیت
زنده‌ی نوبت در فاز بعدی اضافه می‌شود.
"""
from flask import g, jsonify

from app.api import api_bp
from app.core.auth import role_required
from app.core.errors import ApiError
from app.core.utils import utcnow
from app.extensions import db
from app.models.queue_entry import QueueEntry
from app.services.queue import recalculate_queue_estimates


def _get_owned_entry(entry_id):
    entry = db.session.get(QueueEntry, entry_id)
    if entry is None:
        raise ApiError("نوبت مورد نظر یافت نشد", 404)
    if entry.bakery.owner_user_id != g.current_user.id:
        raise ApiError("این نوبت متعلق به نانوایی شما نیست", 403)
    return entry


@api_bp.route("/queue-entries/<int:entry_id>/ready", methods=["PUT"])
@role_required("baker")
def mark_ready(entry_id):
    entry = _get_owned_entry(entry_id)

    if entry.status == "ready":
        # idempotent — دوباره زدن دکمه خطا نمی‌دهد
        return jsonify(entry.to_dict(include_customer=True))
    if entry.status != "waiting":
        raise ApiError("این نوبت در وضعیت فعلی قابل تغییر نیست", 409)

    entry.status = "ready"
    entry.ready_at = utcnow()
    db.session.commit()

    # این نوبت از صفِ در انتظار خارج شد → تخمین بقیه جلو می‌افتد
    recalculate_queue_estimates(entry.bakery)
    return jsonify(entry.to_dict(include_customer=True))


@api_bp.route("/queue-entries/<int:entry_id>/picked-up", methods=["PUT"])
@role_required("baker")
def mark_picked_up(entry_id):
    entry = _get_owned_entry(entry_id)

    if entry.status == "picked_up":
        return jsonify(entry.to_dict(include_customer=True))
    if entry.status not in ("waiting", "ready"):
        raise ApiError("این نوبت در وضعیت فعلی قابل تغییر نیست", 409)

    was_waiting = entry.status == "waiting"
    entry.status = "picked_up"
    entry.picked_up_at = utcnow()
    db.session.commit()

    if was_waiting:
        recalculate_queue_estimates(entry.bakery)
    return jsonify(entry.to_dict(include_customer=True))
