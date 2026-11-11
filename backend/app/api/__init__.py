"""بلوپرینت اصلی API با پیشوند /api."""
from flask import Blueprint

api_bp = Blueprint("api", __name__)


@api_bp.route("/health")
def health():
    """بررسی سلامت سرویس."""
    return {"status": "ok", "service": "bread-queue-api"}


# ثبت مسیرها (import در انتها تا circular import نداشته باشیم)
from app.api import auth, bakeries, bread_types, queue_entries  # noqa: E402,F401
