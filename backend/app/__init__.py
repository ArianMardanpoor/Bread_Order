"""App factory بک‌اند «نوبت نان»."""
from flask import Flask

from config import Config


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    # مسیرهایی مثل /api/bakeries/ هم مثل /api/bakeries پاسخ داده شوند
    app.url_map.strict_slashes = False

    # مقداردهی افزونه‌ها
    from app.extensions import cors, db, migrate

    db.init_app(app)
    migrate.init_app(app, db)
    # برای اجرای محلی (فرانت روی 3000 و بک‌اند روی 5001) CORS باز است؛
    # در سندباکس درخواست‌ها از طریق گیت‌وی همان‌origin پاس داده می‌شوند.
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    # ثبت مدل‌ها در metadata (برای Alembic)
    from app import models  # noqa: F401

    # مدیریت خطاها به‌صورت JSON با پیام فارسی
    from app.core.errors import register_error_handlers

    register_error_handlers(app)

    # ثبت بلوپرینت API
    from app.api import api_bp

    app.register_blueprint(api_bp, url_prefix="/api")

    return app
