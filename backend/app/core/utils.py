"""ابزارهای عمومی زمان و سریالایز."""
from datetime import datetime, timezone


def utcnow():
    """زمان فعلی UTC به‌صورت naive (بدون tzinfo).

    همه‌ی زمان‌های دیتابیس با این تابع ذخیره می‌شوند تا بین SQLite و
    PostgreSQL رفتار یکسانی داشته باشیم.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(dt):
    """تبدیل datetime به رشته‌ی ISO8601 با پسوند Z (یعنی UTC).

    کلاینت با new Date(...) آن را به‌درستی به وقت محلی/تهران تبدیل می‌کند.
    """
    if dt is None:
        return None
    return dt.isoformat() + ("" if dt.tzinfo else "Z")
