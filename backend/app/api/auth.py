"""اندپوینت‌های احراز هویت با شماره موبایل + کد یک‌بارمصرف.

    POST /api/auth/request-otp   {phone}
    POST /api/auth/verify-otp    {phone, code, name?, role?}  → JWT
    GET  /api/auth/me            (با توکن) → اطلاعات کاربر + نانوایی نانوا

در MVP کد OTP در لاگ سرور چاپ می‌شود؛ اگر OTP_DEBUG فعال باشد در پاسخ
هم برمی‌گردد تا بدون پنل پیامکی بتوان تست کرد.
"""
from flask import current_app, g, jsonify

from app.api import api_bp
from app.core.auth import create_token, jwt_required
from app.core.errors import ApiError
from app.core.otp import otp_store
from app.core.utils import utcnow
from app.core.validators import get_json_body, normalize_phone
from app.extensions import db
from app.models.user import User
from app.services.queue import bakery_stats


@api_bp.route("/auth/request-otp", methods=["POST"])
def request_otp():
    data = get_json_body()
    phone = normalize_phone(data.get("phone"))

    code = otp_store.generate(
        phone,
        ttl_seconds=current_app.config["OTP_TTL_SECONDS"],
        cooldown_seconds=current_app.config["OTP_RESEND_COOLDOWN"],
        max_attempts=current_app.config["OTP_MAX_ATTEMPTS"],
    )

    # برای MVP: کد فقط در لاگ سرور چاپ می‌شود (اتصال پنل پیامکی: فاز بعد)
    current_app.logger.info("[OTP] phone=%s code=%s", phone, code)

    response = {"message": "کد تایید ارسال شد"}
    if current_app.config["OTP_DEBUG"]:
        # فقط در حالت توسعه برای تست راحت‌تر
        response["dev_code"] = code
    return jsonify(response)


@api_bp.route("/auth/verify-otp", methods=["POST"])
def verify_otp():
    data = get_json_body()
    phone = normalize_phone(data.get("phone"))

    code = data.get("code")
    if code is None or not str(code).strip():
        raise ApiError("کد تایید را وارد کنید")
    otp_store.verify(phone, code)

    # کاربر موجود → ورود؛ کاربر جدید → ثبت‌نام با نقش انتخابی
    user = User.query.filter_by(phone=phone).first()
    is_new = user is None
    if is_new:
        role = data.get("role") if data.get("role") in ("customer", "baker") else "customer"
        name = (data.get("name") or "").strip()[:100]
        user = User(phone=phone, name=name, role=role, created_at=utcnow())
        db.session.add(user)
        db.session.commit()

    response = {"token": create_token(user), "is_new": is_new, "user": user.to_dict()}
    # اگر نانوا باشد و نانوایی‌اش را ثبت کرده، برای هدایت به پنل برمی‌گردانیم
    if user.role == "baker" and user.bakery:
        response["bakery"] = {**user.bakery.to_dict(), **bakery_stats(user.bakery)}
    return jsonify(response)


@api_bp.route("/auth/me", methods=["GET"])
@jwt_required
def me():
    """اطلاعات کاربر جاری (برای بازیابی نشست بعد از refresh صفحه)."""
    user = g.current_user
    response = {"user": user.to_dict()}
    if user.role == "baker" and user.bakery:
        response["bakery"] = {**user.bakery.to_dict(), **bakery_stats(user.bakery)}
    return jsonify(response)
