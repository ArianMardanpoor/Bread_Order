"""ذخیره‌ی کدهای یک‌بارمصرف (OTP) در حافظه — کافی برای MVP تک‌پروسسی.

نکته: در فاز بعد، ارسال واقعی پیامک و ذخیره‌ی OTP در Redis دیتابیس اضافه می‌شود.
"""
import secrets
from datetime import timedelta

from app.core.errors import ApiError
from app.core.utils import utcnow


class OtpStore:
    def __init__(self):
        # phone -> {"code", "expires_at", "attempts"}
        self._codes = {}
        # phone -> آخرین زمان ارسال (برای cooldown)
        self._last_sent = {}

    def generate(self, phone, ttl_seconds, cooldown_seconds, max_attempts=5):
        """کد جدید تولید می‌کند؛ اگر تازه کد فرستاده باشیم خطای 429 می‌دهد."""
        now = utcnow()
        last = self._last_sent.get(phone)
        if last is not None and (now - last).total_seconds() < cooldown_seconds:
            remaining = int(cooldown_seconds - (now - last).total_seconds())
            raise ApiError(
                f"کد قبلی تازه ارسال شده؛ {remaining} ثانیه دیگر دوباره تلاش کنید", 429
            )
        code = f"{secrets.randbelow(100000):05d}"  # کد ۵ رقمی
        self._codes[phone] = {
            "code": code,
            "expires_at": now + timedelta(seconds=ttl_seconds),
            "attempts": 0,
        }
        self._last_sent[phone] = now
        self._codes[phone]["max_attempts"] = max_attempts
        return code

    def verify(self, phone, code):
        """کد را چک می‌کند؛ در صورت موفقیت کد مصرف می‌شود."""
        record = self._codes.get(phone)
        if record is None:
            raise ApiError("ابتدا درخواست کد تایید بدهید", 400)
        if utcnow() > record["expires_at"]:
            self._codes.pop(phone, None)
            raise ApiError("کد تایید منقضی شده است؛ دوباره کد بگیرید", 400)
        if record["attempts"] >= record.get("max_attempts", 5):
            self._codes.pop(phone, None)
            raise ApiError("تلاش‌های ناموفق زیاد بوده است؛ کد جدید بگیرید", 400)
        if record["code"] != str(code).strip():
            record["attempts"] += 1
            raise ApiError("کد تایید نادرست است", 400)
        # مصرف کد
        self._codes.pop(phone, None)
        return True


# نمونه‌ی سراسری
otp_store = OtpStore()
