"""مدل کاربر — مشتری و نانوا هر دو با شماره موبایل ثبت‌نام می‌کنند."""
from app.core.utils import iso, utcnow
from app.extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    phone = db.Column(db.String(11), nullable=False, unique=True, index=True)
    name = db.Column(db.String(100), nullable=False, default="")
    # customer = مشتری، baker = نانوا
    role = db.Column(
        db.Enum("customer", "baker", name="user_role"),
        nullable=False,
        default="customer",
    )
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    # هر نانوا حداکثر یک نانوایی ثبت می‌کند
    bakery = db.relationship(
        "Bakery", back_populates="owner", uselist=False, cascade="all, delete-orphan"
    )
    queue_entries = db.relationship(
        "QueueEntry", back_populates="customer", cascade="all, delete-orphan"
    )
    reviews = db.relationship(
        "Review", back_populates="customer", cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "phone": self.phone,
            "name": self.name,
            "role": self.role,
            "created_at": iso(self.created_at),
        }
