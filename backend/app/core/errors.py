"""خطاهای API و هندلرهای سراسری.

همه‌ی خطاها JSON برمی‌گردانند و پیام‌ها فارسی هستند چون مستقیماً در UI
نمایش داده می‌شوند.
"""
from flask import jsonify


class ApiError(Exception):
    """خطای قابل نمایش به کاربر؛ message فارسی و status کد HTTP است."""

    def __init__(self, message, status=400, **extra):
        super().__init__(message)
        self.message = message
        self.status = status
        self.extra = extra


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def handle_api_error(err):
        payload = {"error": err.message}
        payload.update(err.extra)
        return jsonify(payload), err.status

    @app.errorhandler(404)
    def handle_404(_err):
        return jsonify({"error": "مسیر یا منبع مورد نظر یافت نشد"}), 404

    @app.errorhandler(405)
    def handle_405(_err):
        return jsonify({"error": "متد این درخواست مجاز نیست"}), 405

    @app.errorhandler(400)
    def handle_400(_err):
        return jsonify({"error": "درخواست نامعتبر است"}), 400

    @app.errorhandler(500)
    def handle_500(_err):
        app.logger.exception("Internal server error")
        return jsonify({"error": "خطای داخلی سرور رخ داد. لطفاً دوباره تلاش کنید"}), 500
