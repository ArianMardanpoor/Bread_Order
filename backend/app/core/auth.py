"""احراز هویت JWT و دکوراتورهای دسترسی."""
import jwt
from datetime import datetime, timezone
from functools import wraps

from flask import current_app, g, request

from app.core.errors import ApiError
from app.extensions import db
from app.models.user import User


def create_token(user):
    """ساخت توکن JWT برای کاربر."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "phone": user.phone,
        "role": user.role,
        "iat": now,
        "exp": now + current_app.config["JWT_EXPIRES"],
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")


def _load_user_from_request():
    """کاربر را از هدر Authorization برمی‌گرداند یا ApiError(401) می‌دهد."""
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise ApiError("برای این عملیات باید وارد حساب خود شوید", 401)
    token = header[len("Bearer "):].strip()
    try:
        payload = jwt.decode(
            token, current_app.config["JWT_SECRET"], algorithms=["HS256"]
        )
    except jwt.ExpiredSignatureError:
        raise ApiError("نشست شما منقضی شده است؛ دوباره وارد شوید", 401)
    except jwt.InvalidTokenError:
        raise ApiError("توکن ورود نامعتبر است", 401)
    try:
        user_id = int(payload.get("sub", 0))
    except (TypeError, ValueError):
        raise ApiError("توکن ورود نامعتبر است", 401)
    user = db.session.get(User, user_id)
    if user is None:
        raise ApiError("کاربر یافت نشد؛ دوباره وارد شوید", 401)
    return user


def jwt_required(fn):
    """نیاز به لاگین (هر نقشی)."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        g.current_user = _load_user_from_request()
        return fn(*args, **kwargs)

    return wrapper


def role_required(role):
    """نیاز به لاگین با نقش مشخص («customer» یا «baker»)."""

    def decorator(fn):
        @wraps(fn)
        @jwt_required
        def wrapper(*args, **kwargs):
            if g.current_user.role != role:
                raise ApiError("برای این عملیات دسترسی لازم را ندارید", 403)
            return fn(*args, **kwargs)

        return wrapper

    return decorator
