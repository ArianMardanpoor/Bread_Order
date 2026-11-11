"""نقطه‌ی ورود بک‌اند «نوبت نان».

اجرا در حالت توسعه:

    python run.py

یا با قابلیت reload خودکار:

    flask --app run.py --debug run --host 0.0.0.0 --port 5001
"""
import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5001")), debug=True)
