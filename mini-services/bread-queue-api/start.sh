#!/bin/bash
# راه‌انداز خودکار بک‌اند Flask «نوبت نان» — توسط سیستم توسعه‌ی سندباکس اجرا می‌شود.
# کد اصلی بک‌اند در پوشه‌ی backend/ قرار دارد؛ این اسکریپت فقط آن را بالا می‌آورد.
set -e

BACKEND_DIR="$(cd "$(dirname "$0")/../../backend" && pwd)"
cd "$BACKEND_DIR"

PY="$BACKEND_DIR/.venv/bin/python"

# ساخت venv و نصب وابستگی‌ها در اولین اجرا
if [ ! -x "$PY" ]; then
  echo "[bread-queue-api] Creating virtualenv and installing dependencies..."
  python3 -m venv .venv
  "$PY" -m pip install --upgrade pip -q
  "$PY" -m pip install -q -r requirements.txt
fi

# اعمال migrationها (بی‌خطر و تکرارپذیر) + درج داده‌ی نمونه در صورت خالی بودن دیتابیس
echo "[bread-queue-api] Applying database migrations..."
"$PY" -m flask --app run.py db upgrade
"$PY" seed.py --if-empty || true

# اگر پروسه‌ی قبلی روی پورت ۵۰۰۱ مانده باشد، آزادش می‌کنیم
pkill -f "flask --app run.py" 2>/dev/null || true
sleep 1

echo "[bread-queue-api] Starting Flask on port 5001..."
exec "$PY" -m flask --app run.py --debug run --host 0.0.0.0 --port 5001
