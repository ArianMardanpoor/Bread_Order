"""تست دود API بک‌اند «نوبت نان» — بدون نیاز به سرور در حال اجرا.

اجرا از ریشه‌ی backend:

    python tests/test_api.py

از Flask test client و دیتابیس in-memory استفاده می‌کند.
"""
import os
import sys
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app  # noqa: E402
from app.core.utils import utcnow  # noqa: E402
from app.extensions import db as _db  # noqa: E402
from config import Config  # noqa: E402

PASSED = 0
FAILED = []


def check(name, condition, detail=""):
    global PASSED
    if condition:
        PASSED += 1
        print(f"  ✓ {name}")
    else:
        FAILED.append(name)
        print(f"  ✗ {name} {detail}")


class TestConfig(Config):
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    TESTING = True
    SECRET_KEY = "test"
    JWT_SECRET = "test-jwt-secret-key-with-enough-length-32b"


def otp_login(client, phone, role="customer", name=""):
    """ورود با OTP در حالت توسعه (کد از پاسخ API خوانده می‌شود).

    برای ورودهای تکراری در تست، cooldown همان شماره دور زده می‌شود.
    """
    from app.core.otp import otp_store

    otp_store._last_sent.pop(phone, None)
    resp = client.post("/api/auth/request-otp", json={"phone": phone})
    assert resp.status_code == 200, resp.get_json()
    code = resp.get_json()["dev_code"]
    resp = client.post(
        "/api/auth/verify-otp",
        json={"phone": phone, "code": code, "role": role, "name": name},
    )
    assert resp.status_code == 200, resp.get_json()
    data = resp.get_json()
    return data["token"], data


def main():
    app = create_app(TestConfig)
    client = app.test_client()

    with app.app_context():
        _db.create_all()

    H_BAKER = {}
    H_CUST = {}

    print("\n[1] سلامت سرویس")
    r = client.get("/api/health")
    check("GET /api/health → 200", r.status_code == 200)

    print("\n[2] درخواست OTP")
    r = client.post("/api/auth/request-otp", json={"phone": "12345"})
    check("شماره نامعتبر → 400", r.status_code == 400, r.get_json())
    r = client.post("/api/auth/request-otp", json={"phone": "09121234567"})
    check("شماره معتبر → 200", r.status_code == 200, r.get_json())
    check("کد توسعه برگردانده شد", "dev_code" in r.get_json())
    r = client.post("/api/auth/request-otp", json={"phone": "09121234567"})
    check("درخواست پشت‌سرهم → 429", r.status_code == 429, r.get_json())
    r = client.post("/api/auth/request-otp", json={"phone": "+989121234568"})
    check("نرمال‌سازی +98 → 200", r.status_code == 200, r.get_json())

    print("\n[3] تایید OTP و ثبت‌نام")
    r = client.post("/api/auth/verify-otp", json={"phone": "09121234567", "code": "00000"})
    check("کد اشتباه → 400", r.status_code == 400, r.get_json())
    token_baker, data = otp_login(client, "09121111111", role="baker", name="احمد احمدی")
    check("ثبت‌نام نانوا → token", bool(token_baker))
    check("نقش نانوا ثبت شد", data["user"]["role"] == "baker")
    check("is_new = true", data["is_new"] is True)
    H_BAKER["Authorization"] = f"Bearer {token_baker}"

    token_cust, data = otp_login(client, "09120000001", role="customer", name="زهرا محمدی")
    check("ثبت‌نام مشتری → token", bool(token_cust))
    H_CUST["Authorization"] = f"Bearer {token_cust}"

    # ورود دوباره همان کاربر → is_new=false و نقش قبلی حفظ می‌شود
    _, data2 = otp_login(client, "09121111111", role="customer")
    check("ورود مجدد → is_new=false", data2["is_new"] is False)
    check("نقش قبلی (baker) حفظ شد", data2["user"]["role"] == "baker")

    r = client.get("/api/auth/me", headers=H_BAKER)
    check("GET /api/auth/me → 200", r.status_code == 200)
    r = client.get("/api/auth/me")
    check("بدون توکن → 401", r.status_code == 401)

    print("\n[4] ثبت نانوایی")
    r = client.post("/api/bakeries", headers=H_CUST,
                    json={"name": "نانوایی تست"})
    check("مشتری نمی‌تواند نانوایی ثبت کند → 403", r.status_code == 403)
    r = client.post("/api/bakeries", headers=H_BAKER, json={})
    check("بدون نام → 400", r.status_code == 400)
    r = client.post("/api/bakeries", headers=H_BAKER,
                    json={"name": "نانوایی سنگک احمدی", "address": "تهران، انقلاب",
                          "working_hours": "۶ تا ۲۰", "production_rate": 2,
                          "in_person_queue_estimate": 50})
    check("ثبت نانوایی → 201", r.status_code == 201, r.get_json())
    bakery = r.get_json()
    check("آمار اولیه: صف حضوری ۵۰", bakery["in_person_queue_estimate"] == 50)
    r = client.post("/api/bakeries", headers=H_BAKER, json={"name": "دومین"})
    check("ثبت نانوایی دوم → 409", r.status_code == 409)

    print("\n[5] انواع نون")
    r = client.post(f"/api/bakeries/{bakery['id']}/bread-types", headers=H_BAKER,
                    json={"name": "سنگک", "price": 4000})
    check("افزودن نوع نون → 201", r.status_code == 201)
    bread_sangak = r.get_json()
    r = client.post(f"/api/bakeries/{bakery['id']}/bread-types", headers=H_BAKER,
                    json={"name": "بربری", "price": 5000})
    bread_barbari = r.get_json()
    r = client.post(f"/api/bakeries/{bakery['id']}/bread-types", headers=H_BAKER,
                    json={"name": "سنگک", "price": 4500})
    check("نوع نون تکراری → 409", r.status_code == 409)
    r = client.put(f"/api/bread-types/{bread_sangak['id']}", headers=H_BAKER,
                   json={"price": 4500})
    check("ویرایش قیمت → 200", r.status_code == 200 and r.get_json()["price"] == 4500)
    r = client.post(f"/api/bakeries/{bakery['id']}/bread-types", headers=H_CUST,
                    json={"name": "تست", "price": 1000})
    check("افزودن توسط مشتری → 403", r.status_code == 403)

    print("\n[6] ویرایش نانوایی و صف حضوری")
    r = client.put(f"/api/bakeries/{bakery['id']}", headers=H_BAKER,
                   json={"name": "نانوایی سنگک برادران احمدی", "production_rate": 2})
    check("ویرایش نام و نرخ → 200", r.status_code == 200)
    r = client.put(f"/api/bakeries/{bakery['id']}/queue-estimate", headers=H_BAKER,
                   json={"in_person_queue_estimate": 60})
    check("به‌روزرسانی صف حضوری → 200", r.status_code == 200)
    check("مقدار جدید ثبت شد", r.get_json()["in_person_queue_estimate"] == 60)
    r = client.put(f"/api/bakeries/{bakery['id']}/queue-estimate", headers=H_BAKER,
                   json={"in_person_queue_estimate": -5})
    check("مقدار منفی → 400", r.status_code == 400)

    print("\n[7] منطق صف و تخمین زمان")
    from app.models import Bakery as BakeryModel, User as UserModel
    from app.services.queue import create_queue_entry, recalculate_queue_estimates
    with app.app_context():
        b = _db.session.get(BakeryModel, bakery["id"])
        c1 = UserModel.query.filter_by(phone="09120000001").first()
        c2 = UserModel.query.filter_by(phone="09121111111").first()  # نانوا هم مشتری نان دیگری می‌تواند باشد
        e1 = create_queue_entry(b, c1, [
            {"bread_type_id": bread_sangak["id"], "name": "سنگک", "qty": 2, "price": 4500}])
        e2 = create_queue_entry(b, c2, [
            {"bread_type_id": bread_sangak["id"], "name": "سنگک", "qty": 3, "price": 4500},
            {"bread_type_id": bread_barbari["id"], "name": "بربری", "qty": 1, "price": 5000}])
        # rate=2/min، صف حضوری=۶۰ → تخلیه‌ی صف حضوری = ۳۰ دقیقه
        now = utcnow()
        check("نوبت ۱: شماره ۱", e1.position == 1)
        check("نوبت ۲: شماره ۲", e2.position == 2)
        d1 = (e1.estimated_ready_at - now).total_seconds() / 60.0
        d2 = (e2.estimated_ready_at - now).total_seconds() / 60.0
        # نوبت ۱: ۶۰/۲ = ۳۰ دقیقه | نوبت ۲: ۳۰ + نان‌های نوبت ۱ (۲ نان)/۲ = ۳۱ دقیقه
        check("تخمین نوبت ۱ ≈ ۳۰ دقیقه", 29 <= d1 <= 31, f"got {d1:.1f}")
        check("تخمین نوبت ۲ ≈ ۳۱ دقیقه", 30 <= d2 <= 32, f"got {d2:.1f}")

    r = client.get(f"/api/bakeries/{bakery['id']}", headers={})
    detail = r.get_json()
    check("جزئیات عمومی → 200", r.status_code == 200)
    check("آمار صف: ۲ نوبت waiting", detail["waiting_count"] == 2)
    check("مجموع نان‌های صف = ۶", detail["breads_waiting"] == 6)
    # (۶۰ حضوری + ۶ آنلاین) ÷ ۲ = ۳۳ دقیقه
    check("انتظار کل ≈ ۳۳ دقیقه", detail["estimated_wait_minutes"] == 33)
    check("انواع نون در جزئیات", len(detail["bread_types"]) == 2)

    print("\n[8] پنل نانوا: صف و وضعیت نوبت‌ها")
    r = client.get(f"/api/bakeries/{bakery['id']}/queue", headers=H_CUST)
    check("مشتری لیست صف نانوا را نمی‌بیند → 403", r.status_code == 403)
    r = client.get(f"/api/bakeries/{bakery['id']}/queue", headers=H_BAKER)
    check("لیست صف → 200", r.status_code == 200)
    entries = r.get_json()["entries"]
    check("۲ نوبت به ترتیب", len(entries) == 2 and entries[0]["position"] == 1)
    check("نام مشتری در نوبت", entries[0]["customer_name"] == "زهرا محمدی")
    check("مجموع نان نوبت ۲ = ۴", entries[1]["total_qty"] == 4)

    # آماده شدن نوبت ۱ → تخمین نوبت ۲ باید جلو بیفتد (۳۱ → ۳۰ دقیقه)
    r = client.put(f"/api/queue-entries/{entries[0]['id']}/ready", headers=H_BAKER)
    check("علامت آماده شد → 200", r.status_code == 200)
    check("وضعیت ready", r.get_json()["status"] == "ready")
    r = client.put(f"/api/queue-entries/{entries[0]['id']}/ready", headers=H_BAKER)
    check("تکرار «آماده شد» بی‌خطا", r.status_code == 200)
    r = client.get(f"/api/bakeries/{bakery['id']}/queue", headers=H_BAKER)
    entries = r.get_json()["entries"]
    e2_est = entries[1]["estimated_ready_at"]
    from datetime import datetime
    est = datetime.fromisoformat(e2_est.replace("Z", ""))
    d2_new = (est - utcnow()).total_seconds() / 60.0
    check("بعد از آماده شدن نوبت ۱، تخمین نوبت ۲ ≈ ۳۰ دقیقه", 29 <= d2_new <= 31, f"got {d2_new:.1f}")

    r = client.put(f"/api/queue-entries/{entries[0]['id']}/picked-up", headers=H_BAKER)
    check("تحویل داده شد → 200", r.status_code == 200 and r.get_json()["status"] == "picked_up")
    r = client.put(f"/api/queue-entries/{entries[0]['id']}/ready", headers=H_BAKER)
    check("تغییر نوبت تحویل‌شده → 409", r.status_code == 409)

    print("\n[9] نظرات")
    from app.models import Review
    with app.app_context():
        b = _db.session.get(BakeryModel, bakery["id"])
        c1 = UserModel.query.filter_by(phone="09120000001").first()
        _db.session.add(Review(bakery_id=b.id, customer_user_id=c1.id, rating=5,
                               comment="عالی بود"))
        _db.session.add(Review(bakery_id=b.id, customer_user_id=b.owner_user_id, rating=4,
                               comment="خوب"))
        _db.session.commit()
    r = client.get(f"/api/bakeries/{bakery['id']}/reviews")
    check("لیست نظرات عمومی → 200", r.status_code == 200)
    check("میانگین امتیاز ۴.۵", r.get_json()["avg_rating"] == 4.5)
    check("۲ نظر", r.get_json()["count"] == 2)

    print("\n[10] دسترسی‌های متقاطع")
    token_baker2, _ = otp_login(client, "09123333333", role="baker", name="رضا رضایی")
    H_BAKER2 = {"Authorization": f"Bearer {token_baker2}"}
    r = client.get(f"/api/bakeries/{bakery['id']}/queue", headers=H_BAKER2)
    check("نانوای دیگر → 403", r.status_code == 403)
    r = client.get(f"/api/bakeries/9999")
    check("نانوایی ناموجود → 404", r.status_code == 404)

    # تخمین بدون نرخ تولید
    with app.app_context():
        b2 = BakeryModel(owner_user_id=3, name="نانوایی بدون نرخ", in_person_queue_estimate=10)
        _db.session.add(b2)
        _db.session.commit()
        b2_id = b2.id
    r = client.get(f"/api/bakeries/{b2_id}")
    check("بدون نرخ تولید → تخمین null", r.get_json()["estimated_wait_minutes"] is None)

    print("\n" + "=" * 50)
    print(f"نتیجه: {PASSED} تست موفق، {len(FAILED)} تست ناموفق")
    if FAILED:
        print("ناموفق‌ها:", FAILED)
        sys.exit(1)
    print("همه‌ی تست‌ها سبز شدند ✓")


if __name__ == "__main__":
    main()
