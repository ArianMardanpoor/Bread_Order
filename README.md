# نوبت نان — سیستم نوبت‌دهی آنلاین نانوایی (MVP)

نسخه‌ی اول وب‌اپلیکیشنی که نونوایی‌ها در آن ثبت‌نام می‌کنند، مشتری‌ها نوبت آنلاین
می‌گیرند و بدون ایستادن در صف فیزیکی، در زمان تخمینی برای تحویل نان مراجعه می‌کنند.
(بدون پیک/تحویل — مراجعه‌ی حضوری خود مشتری)

- **رابط کاربری:** کاملاً فارسی، راست‌به‌چپ (RTL)، فونت وزیرمتن
- **احراز هویت:** شماره موبایل + کد یک‌بارمصرف (OTP)
- **به‌روزرسانی زنده:** polling ساده (WebSocket در فاز بعد)
- **نقشه:** در این فاز فقط لیست نانوایی‌ها (نقشه‌ی نشان/بلد در فاز بعد)

---

## وضعیت فعلی (فاز ۱ و ۲ + اندپوینت‌های نانوا)

| بخش | وضعیت |
| --- | --- |
| ساختار پروژه backend / frontend | ✓ |
| مدل‌های دیتابیس + migration اولیه | ✓ |
| Auth با موبایل + OTP + JWT | ✓ |
| اندپوینت‌های عمومی نانوایی‌ها (لیست/جزئیات/نظرات) | ✓ |
| ثبت/ویرایش نانوایی، نرخ تولید، صف حضوری، انواع نون | ✓ |
| علامت‌گذاری «آماده شد» / «تحویل داده شد» | ✓ |
| منطق محاسبه‌ی `estimated_ready_at` + بازمحاسبه‌ی خودکار | ✓ |
| فرم ورود OTP + لیست و جزئیات نانوایی‌ها (مشتری) | ✓ |
| پنل روزانه نانوا (+/−، بنر یادآوری، لیست نوبت‌ها) | ✓ |
| **فاز بعد:** گرفتن نوبت توسط مشتری، وضعیت زنده‌ی نوبت، تاریخچه، ثبت نظر | در صف توسعه |

## ساختار پروژه

```
my-project/
├── backend/                  ← بک‌اند Flask (پایتون)
│   ├── app/
│   │   ├── __init__.py       ← app factory
│   │   ├── extensions.py     ← SQLAlchemy / Migrate / CORS
│   │   ├── config.py         ← تنظیمات (قابل تغییر از طریق .env)
│   │   ├── models/           ← users, bakeries, bread_types, queue_entries, reviews
│   │   ├── core/             ← JWT، OTP، اعتبارسنجی، خطاها
│   │   ├── services/queue.py ← منطق صف و محاسبه‌ی زمان تخمینی
│   │   └── api/              ← اندپوینت‌ها (auth, bakeries, bread_types, queue_entries)
│   ├── migrations/           ← migrationهای Alembic (Flask-Migrate)
│   ├── tests/test_api.py     ← تست دود API (۵۴ تست)
│   ├── seed.py               ← داده‌ی نمونه
│   ├── requirements.txt
│   └── run.py                ← python run.py → http://localhost:5001
│
├── src/                      ← فرانت‌اند React (Next.js 16 + TypeScript + Tailwind)
│   ├── app/                  ← layout (RTL + وزیرمتن) و صفحه‌ی اصلی SPA
│   ├── components/bq/        ← ویوهای مشتری/نانوا
│   └── lib/                  ← api client، تایپ‌ها، قالب‌بندی فارسی، polling
│
├── mini-services/bread-queue-api/   ← لانچر اجرای خودکار بک‌اند در سندباکس
└── Caddyfile                 ← گیت‌وی: درخواست‌های /api?XTransformPort=5001 → بک‌اند
```

## استک فنی

- **بک‌اند:** Flask + SQLAlchemy ORM + Flask-Migrate (Alembic)
- **دیتابیس:** PostgreSQL (در محیط توسعه‌ی سندباکس از SQLite استفاده می‌شود؛ فقط
  کافی است `DATABASE_URL` را ست کنید)
- **فرانت‌اند:** React (Next.js) + TypeScript + Tailwind CSS + shadcn/ui
- **احراز هویت:** موبایل + OTP (در MVP کد در لاگ سرور چاپ می‌شود و در حالت توسعه
  در پاسخ API هم برمی‌گردد؛ اتصال پنل پیامکی در فاز بعد)

## راه‌اندازی محلی

### بک‌اند

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # ویندوز: .venv\Scripts\activate
pip install -r requirements.txt

# برای PostgreSQL در فایل backend/.env این خط را فعال کنید:
# DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/bread_queue

flask --app run.py db upgrade      # اعمال migrationها
python seed.py                     # (اختیاری) داده‌ی نمونه
python run.py                      # اجرا روی http://localhost:5001
```

تست‌ها:

```bash
python tests/test_api.py
```

### فرانت‌اند

```bash
bun install        # یا npm install
bun run dev        # اجرا روی http://localhost:3000
```

در اجرای محلی، درخواست‌های `/api` باید به پورت ۵۰۰۱ برود؛ روش پیشنهادی اضافه‌کردن
rewrite در `next.config.ts` است:

```ts
async rewrites() {
  return [{ source: "/api/:path*", destination: "http://localhost:5001/api/:path*" }];
}
```

## اندپوینت‌های پیاده‌سازی‌شده

### احراز هویت

| متد | مسیر | نقش | توضیح |
| --- | --- | --- | --- |
| POST | `/api/auth/request-otp` | عمومی | `{phone}` → ارسال کد ۵ رقمی |
| POST | `/api/auth/verify-otp` | عمومی | `{phone, code, name?, role?}` → توکن JWT |
| GET | `/api/auth/me` | لاگین‌شده | اطلاعات کاربر + نانوایی نانوا |

### نانوایی‌ها

| متد | مسیر | نقش | توضیح |
| --- | --- | --- | --- |
| GET | `/api/bakeries` | عمومی | لیست نانوایی‌ها با وضعیت صف و امتیاز |
| GET | `/api/bakeries/:id` | عمومی | جزئیات + انواع نون + وضعیت صف |
| GET | `/api/bakeries/:id/reviews` | عمومی | نظرات و میانگین امتیاز |
| POST | `/api/bakeries` | نانوا | ثبت نانوایی (هر نانوا یک نانوایی) |
| PUT | `/api/bakeries/:id` | نانوا | ویرایش اطلاعات و `production_rate` |
| PUT | `/api/bakeries/:id/queue-estimate` | نانوا | به‌روزرسانی `in_person_queue_estimate` |
| GET | `/api/bakeries/:id/queue` | نانوا | نوبت‌های آنلاین به ترتیب |
| POST | `/api/bakeries/:id/bread-types` | نانوا | افزودن نوع نون |
| PUT | `/api/bread-types/:id` | نانوا | ویرایش نوع نون |
| DELETE | `/api/bread-types/:id` | نانوا | حذف نوع نون |
| PUT | `/api/queue-entries/:id/ready` | نانوا | علامت «آماده شد» |
| PUT | `/api/queue-entries/:id/picked-up` | نانوا | علامت «تحویل داده شد» |

### فاز بعد (مشتری)

`POST /api/bakeries/:id/queue-entries` · `GET /api/queue-entries/my` ·
`GET /api/queue-entries/:id/status` · `POST /api/bakeries/:id/reviews`

## منطق محاسبه‌ی زمان تخمینی

هر بار که `in_person_queue_estimate` یا `production_rate` تغییر کند یا نوبتی اضافه/
حذف/پایان یابد، تخمین **همه‌ی نوبت‌های waiting** دوباره محاسبه می‌شود:

```
estimated_ready_at(نوبت) = الان
    + (تخمین صف حضوری ÷ نرخ تولید)              ← صف حضوری همیشه اولویت دارد
    + (مجموع نانِ نوبت‌های آنلاین جلوتر ÷ نرخ تولید)
```

مثال: نرخ تولید ۲ نان در دقیقه، صف حضوری ۶۰ نان، نوبت جلویی ۲ نان →
نوبت اول: ۳۰ دقیقه دیگر · نوبت دوم: ۳۱ دقیقه دیگر

اگر بیش از **۱۰ دقیقه** از آخرین به‌روزرسانی صف حضوری بگذرد، پنل نانوا بنر برجسته‌ی
«لطفاً تعداد صف حضوری را به‌روزرسانی کنید» نشان می‌دهد.

## حساب‌های نمونه (پس از اجرای seed)

| نقش | شماره موبایل | نام |
| --- | --- | --- |
| نانوا | `09121111111` | احمد احمدی — نانوایی سنگک برادران احمدی |
| نانوا | `09122222222` | محمود مخلصی — نانوایی بربری مخلصی |
| نانوا | `09123333333` | رضا رضایی — نانوایی لواش شبانه‌روزی |
| مشتری | `09120000001` | زهرا محمدی |
| مشتری | `09120000002` | علی کریمی |

> **نکته‌ی OTP در حالت توسعه:** چون پنل پیامکی متصل نیست، کد تایید در لاگ سرور
> چاپ می‌شود (`[OTP] phone=... code=...`) و چون `OTP_DEBUG=1` است در پاسخ API و
> روی صفحه‌ی ورود هم نمایش داده می‌شود. برای محیط واقعی در `backend/.env` مقدار
> `OTP_DEBUG=0` بگذارید.

## نکته‌های امنیتی برای محیط واقعی

- مقدار `SECRET_KEY` و `JWT_SECRET` را با رشته‌های تصادفی طولانی جایگزین کنید.
- `OTP_DEBUG=0` کنید.
- برای بهره‌برداری از Flask با gunicorn و در کنار reverse-proxy (مثل Nginx) اجرا کنید.
