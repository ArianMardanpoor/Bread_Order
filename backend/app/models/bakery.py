"""مدل نانوایی."""
from app.core.utils import iso, utcnow
from app.extensions import db


class Bakery(db.Model):
    __tablename__ = "bakeries"

    id = db.Column(db.Integer, primary_key=True)
    owner_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    name = db.Column(db.String(120), nullable=False)
    address = db.Column(db.String(300), nullable=False, default="")
    # ساعت کاری به‌صورت متن ساده، مثلاً «صبح ۶ تا ۱۰ و عصر ۱۶ تا ۲۰»
    working_hours = db.Column(db.String(200), nullable=False, default="")

    # نرخ تولید: تعداد نان در دقیقه (وارد شده توسط نانوا)
    production_rate = db.Column(db.Integer)
    # تخمین تعداد نانِ صف حضوری (توسط نانوا به‌روزرسانی می‌شود)
    in_person_queue_estimate = db.Column(db.Integer, nullable=False, default=0)
    # آخرین زمان به‌روزرسانی تخمین صف حضوری
    in_person_queue_updated_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    owner = db.relationship("User", back_populates="bakery")
    bread_types = db.relationship(
        "BreadType",
        back_populates="bakery",
        cascade="all, delete-orphan",
        order_by="BreadType.id",
    )
    queue_entries = db.relationship(
        "QueueEntry", back_populates="bakery", cascade="all, delete-orphan"
    )
    reviews = db.relationship(
        "Review", back_populates="bakery", cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "owner_user_id": self.owner_user_id,
            "name": self.name,
            "address": self.address,
            "working_hours": self.working_hours,
            "production_rate": self.production_rate,
            "in_person_queue_estimate": self.in_person_queue_estimate,
            "in_person_queue_updated_at": iso(self.in_person_queue_updated_at),
            "created_at": iso(self.created_at),
        }
