"""مدل نوبت آنلاین (صف مشتری‌های آنلاین نانوایی)."""
from app.core.utils import iso, utcnow
from app.extensions import db


class QueueEntry(db.Model):
    __tablename__ = "queue_entries"
    __table_args__ = (
        # برای مرتب‌سازی سریع صف هر نانوایی
        db.Index("ix_queue_entries_bakery_position", "bakery_id", "position"),
    )

    id = db.Column(db.Integer, primary_key=True)
    bakery_id = db.Column(
        db.Integer, db.ForeignKey("bakeries.id"), nullable=False, index=True
    )
    customer_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    # JSON: [{"bread_type_id": 1, "name": "سنگک", "qty": 2, "price": 4000}, ...]
    # نام و قیمت در لحظه‌ی ثبت نوبت ذخیره می‌شود (snapshot) تا با تغییر منوی
    # نانوایی، نوبت‌های قبلی خراب نشوند.
    items = db.Column(db.JSON, nullable=False, default=list)

    # waiting = در انتظار، ready = آماده شد، picked_up = تحویل داده شد، cancelled = لغو شد
    status = db.Column(
        db.Enum("waiting", "ready", "picked_up", "cancelled", name="queue_entry_status"),
        nullable=False,
        default="waiting",
        index=True,
    )
    # شماره‌ی نوبت در صف آنلاین نانوایی (به ترتیب ایجاد)
    position = db.Column(db.Integer, nullable=False)
    # زمان تخمینی آماده شدن — توسط سرویس صف محاسبه می‌شود
    estimated_ready_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    ready_at = db.Column(db.DateTime)
    picked_up_at = db.Column(db.DateTime)

    bakery = db.relationship("Bakery", back_populates="queue_entries")
    customer = db.relationship("User", back_populates="queue_entries")

    @property
    def total_qty(self):
        """مجموع تعداد نان‌های این نوبت."""
        return sum(int(i.get("qty", 0)) for i in (self.items or []) if isinstance(i, dict))

    def to_dict(self, include_customer=False):
        data = {
            "id": self.id,
            "bakery_id": self.bakery_id,
            "customer_user_id": self.customer_user_id,
            "position": self.position,
            "status": self.status,
            "items": self.items or [],
            "total_qty": self.total_qty,
            "estimated_ready_at": iso(self.estimated_ready_at),
            "created_at": iso(self.created_at),
            "ready_at": iso(self.ready_at),
            "picked_up_at": iso(self.picked_up_at),
        }
        if include_customer:
            data["customer_name"] = self.customer.name if self.customer else ""
            data["customer_phone"] = self.customer.phone if self.customer else ""
        return data
