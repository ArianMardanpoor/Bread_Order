"""اعتبارسنجی ورودی‌های API (با پیام‌های فارسی)."""
import re

from flask import request

from app.core.errors import ApiError

PHONE_RE = re.compile(r"^09\d{9}$")


def get_json_body():
    """بدنه‌ی JSON درخواست را برمی‌گرداند یا خطای فارسی می‌دهد."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("بدنه‌ی درخواست باید JSON معتبر باشد")
    return data


def normalize_phone(raw):
    """شماره موبایل ایرانی را نرمال‌سازی و اعتبارسنجی می‌کند.

    قبول: 09121234567 / +989121234567 / 00989121234567
    """
    if not isinstance(raw, str):
        raise ApiError("شماره موبایل معتبر نیست. نمونه: 09121234567")
    phone = raw.strip().replace(" ", "").replace("-", "")
    if phone.startswith("+98"):
        phone = "0" + phone[3:]
    elif phone.startswith("0098"):
        phone = "0" + phone[4:]
    if not PHONE_RE.match(phone):
        raise ApiError("شماره موبایل معتبر نیست. نمونه: 09121234567")
    return phone


def require_str(value, field_label, max_len=None):
    """رشته‌ی اجباری (بعد از strip نباید خالی باشد)."""
    if not isinstance(value, str) or not value.strip():
        raise ApiError(f"«{field_label}» الزامی است")
    value = value.strip()
    if max_len and len(value) > max_len:
        raise ApiError(f"«{field_label}» حداکثر می‌تواند {max_len} کاراکتر باشد")
    return value


def optional_str(value, field_label, max_len=None, default=""):
    """رشته‌ی اختیاری؛ None یا غیررشته‌ای → مقدار پیش‌فرض."""
    if value is None:
        return default
    if not isinstance(value, str):
        raise ApiError(f"«{field_label}» باید متن باشد")
    value = value.strip()
    if max_len and len(value) > max_len:
        raise ApiError(f"«{field_label}» حداکثر می‌تواند {max_len} کاراکتر باشد")
    return value


def as_int(value, field_label, min_val=None, max_val=None, default=None):
    """تبدیل به عدد صحیح با محدوده‌ی اختیاری.

    None یا رشته‌ی خالی → مقدار default (بدون خطا).
    مقدار نامعتبر → ApiError با پیام فارسی.
    """
    if value is None or value == "":
        return default
    try:
        number = int(value)
    except (TypeError, ValueError):
        raise ApiError(f"«{field_label}» باید عدد صحیح باشد")
    if min_val is not None and number < min_val:
        raise ApiError(f"«{field_label}» باید حداقل {min_val} باشد")
    if max_val is not None and number > max_val:
        raise ApiError(f"«{field_label}» حداکثر می‌تواند {max_val} باشد")
    return number
