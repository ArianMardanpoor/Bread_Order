"""تنظیمات بک‌اند نوبت نان.

همه‌ی مقادیر از طریق متغیرهای محیطی (یا فایل backend/.env) قابل تغییر هستند.
برای اتصال به PostgreSQL کافی است DATABASE_URL را مقداردهی کنید، مثلاً:

    DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/bread_queue
"""
import os
from datetime import timedelta

from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# فایل backend/.env در صورت وجود خوانده می‌شود
load_dotenv(os.path.join(BASE_DIR, ".env"))


def _resolve_database_url():
    """تعیین اتصال دیتابیس.

    DATABASE_URL معتبر SQLAlchemy را می‌پذیرد، مثل:
        postgresql+psycopg2://postgres:postgres@localhost:5432/bread_queue
        sqlite:////absolute/path/to/db.sqlite3

    اگر DATABASE_URL ست نباشد یا فرمت غیر-SQLAlchemy داشته باشد (مثل
    فرمت file: مربوط به Prisma در برخی محیط‌ها)، به SQLite محلی برمی‌گردیم.
    """
    url = os.getenv("DATABASE_URL", "").strip()
    if url and "://" in url and not url.startswith("file:"):
        return url
    return f"sqlite:///{os.path.join(BASE_DIR, 'bread_queue.db')}"


class Config:
    # امضای session فلانک (در صورت استفاده)
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")

    # اتصال دیتابیس؛ پیش‌فرض SQLite محلی برای توسعه‌ی سریع
    SQLALCHEMY_DATABASE_URI = _resolve_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # توکن JWT
    JWT_SECRET = os.getenv("JWT_SECRET", "dev-jwt-secret-change-in-production")
    JWT_EXPIRES = timedelta(days=int(os.getenv("JWT_EXPIRES_DAYS", "7")))

    # کد یک‌بارمصرف
    OTP_TTL_SECONDS = int(os.getenv("OTP_TTL_SECONDS", "120"))        # اعتبار کد: ۲ دقیقه
    OTP_RESEND_COOLDOWN = int(os.getenv("OTP_RESEND_COOLDOWN", "30")) # فاصله‌ی حداقلی بین دو درخواست کد
    OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))        # حداکثر تلاش برای هر کد
    # در حالت توسعه (1) کد OTP در پاسخ API هم برگردانده می‌شود تا بدون پنل پیامک بتوان تست کرد.
    # اتصال واقعی به پنل پیامکی در فاز بعد اضافه می‌شود.
    OTP_DEBUG = os.getenv("OTP_DEBUG", "1") == "1"

    # اگر بیش از این مقدار (ثانیه) از آخرین به‌روزرسانی صف حضوری بگذرد،
    # پنل نانوا بنر یادآوری نشان می‌دهد.
    QUEUE_STALE_SECONDS = int(os.getenv("QUEUE_STALE_SECONDS", "600"))
