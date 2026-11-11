"""پرکردن دیتابیس با داده‌ی نمونه برای توسعه و دمو.

اجرا:

    python seed.py              → ریست کامل و درج داده‌ی نمونه
    python seed.py --if-empty   → فقط اگر دیتابیس خالی بود (برای اجرای خودکار)

شماره‌های موبایل نمونه:
    نانواها:   09121111111 (احمد احمدی) / 09122222222 (محمود مخلصی) / 09123333333 (رضا رضایی)
    مشتری‌ها:   09120000001 (زهرا محمدی) / 09120000002 (علی کریمی) / 09120000003 (مریم حسینی)

برای ورود با این حساب‌ها، در صفحه‌ی ورود همان شماره را وارد کنید؛ کد OTP در
حالت توسعه (OTP_DEBUG=1) در پاسخ API و لاگ سرور چاپ می‌شود.
"""
import sys

from app import create_app
from app.core.utils import utcnow
from app.extensions import db
from app.models import Bakery, BreadType, Review, User
from app.services.queue import create_queue_entry


def seed():
    db.drop_all()
    db.create_all()

    # ─── کاربران ───
    baker_ahmadi = User(phone="09121111111", name="احمد احمدی", role="baker")
    baker_makhsousi = User(phone="09122222222", name="محمود مخلصی", role="baker")
    baker_rezaei = User(phone="09123333333", name="رضا رضایی", role="baker")

    customer_zahra = User(phone="09120000001", name="زهرا محمدی", role="customer")
    customer_ali = User(phone="09120000002", name="علی کریمی", role="customer")
    customer_maryam = User(phone="09120000003", name="مریم حسینی", role="customer")

    db.session.add_all(
        [
            baker_ahmadi, baker_makhsousi, baker_rezaei,
            customer_zahra, customer_ali, customer_maryam,
        ]
    )
    db.session.commit()

    # ─── نانوایی‌ها ───
    bakery_sangak = Bakery(
        owner_user_id=baker_ahmadi.id,
        name="نانوایی سنگک برادران احمدی",
        address="تهران، خیابان انقلاب، نرسیده به میدان آزادی، پلاک ۱۲",
        working_hours="صبح ۶ تا ۱۰ و عصر ۱۶ تا ۲۰",
        production_rate=2,   # ۲ نان در دقیقه
        in_person_queue_estimate=40,
        in_person_queue_updated_at=utcnow(),
    )
    bakery_barbari = Bakery(
        owner_user_id=baker_makhsousi.id,
        name="نانوایی بربری مخلصی",
        address="تهران، میدان ونک، خیابان گاندی جنوبی، پلاک ۸",
        working_hours="۶:۳۰ تا ۱۳ و ۱۶:۳۰ تا ۲۱",
        production_rate=3,
        in_person_queue_estimate=25,
        in_person_queue_updated_at=utcnow(),
    )
    bakery_lavash = Bakery(
        owner_user_id=baker_rezaei.id,
        name="نانوایی لواش شبانه‌روزی رضایی",
        address="تهران، سعادت‌آباد، میدان کاج، ابتدای بلوار دریا",
        working_hours="۲۴ ساعته",
        production_rate=4,
        in_person_queue_estimate=15,
        in_person_queue_updated_at=utcnow(),
    )
    db.session.add_all([bakery_sangak, bakery_barbari, bakery_lavash])
    db.session.commit()

    # ─── انواع نون ───
    breads = [
        BreadType(bakery_id=bakery_sangak.id, name="سنگک", price=4000),
        BreadType(bakery_id=bakery_sangak.id, name="بربری", price=5000),
        BreadType(bakery_id=bakery_barbari.id, name="بربری معمولی", price=4500),
        BreadType(bakery_id=bakery_barbari.id, name="بربری کنجدار مخصوص", price=6000),
        BreadType(bakery_id=bakery_barbari.id, name="تافتون", price=3000),
        BreadType(bakery_id=bakery_lavash.id, name="لواش", price=1500),
        BreadType(bakery_id=bakery_lavash.id, name="تافتون", price=2500),
    ]
    db.session.add_all(breads)
    db.session.commit()

    # ─── نظرات ───
    reviews = [
        Review(bakery_id=bakery_sangak.id, customer_user_id=customer_zahra.id, rating=5,
               comment="نان سنگکش همیشه گرم و تازه است. با نوبت آنلاین دیگه توی صف نمی‌ایستم."),
        Review(bakery_id=bakery_sangak.id, customer_user_id=customer_ali.id, rating=4,
               comment="کیفیت نون خوبه، فقط پارکینگ نداره."),
        Review(bakery_id=bakery_barbari.id, customer_user_id=customer_maryam.id, rating=5,
               comment="بربری کنجدارش فوق‌العاده است! حتماً امتحان کنید."),
        Review(bakery_id=bakery_barbari.id, customer_user_id=customer_zahra.id, rating=4,
               comment="برنامه‌ی زمانی دقیق بود و سر وقت تحویل دادن."),
        Review(bakery_id=bakery_lavash.id, customer_user_id=customer_ali.id, rating=3,
               comment="شب‌ها شلوغ می‌شه ولی با نوبت آنلاین قابل تحمل شده."),
    ]
    db.session.add_all(reviews)
    db.session.commit()

    # ─── چند نوبت آنلاین نمونه برای نانوایی سنگک ───
    create_queue_entry(
        bakery_sangak, customer_zahra,
        [{"bread_type_id": breads[0].id, "name": "سنگک", "qty": 2, "price": 4000}],
    )
    create_queue_entry(
        bakery_sangak, customer_ali,
        [{"bread_type_id": breads[0].id, "name": "سنگک", "qty": 3, "price": 4000},
         {"bread_type_id": breads[1].id, "name": "بربری", "qty": 1, "price": 5000}],
    )

    db.session.commit()
    print("✓ داده‌ی نمونه درج شد: ۶ کاربر، ۳ نانوایی، ۷ نوع نون، ۵ نظر، ۲ نوبت آنلاین")


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        if "--if-empty" in sys.argv:
            if User.query.first() is not None:
                print("دیتابیس خالی نیست؛ درج داده‌ی نمونه رد شد.")
                sys.exit(0)
        seed()
