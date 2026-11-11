"""مدل نظر و امتیاز مشتری درباره‌ی نانوایی."""
from app.core.utils import iso, utcnow
from app.extensions import db


class Review(db.Model):
    __tablename__ = "reviews"
    __table_args__ = (
        db.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_reviews_rating_range"),
        # هر مشتری برای هر نانوایی یک نظر ثبت می‌کند
        db.UniqueConstraint("bakery_id", "customer_user_id", name="uq_review_per_customer"),
    )

    id = db.Column(db.Integer, primary_key=True)
    bakery_id = db.Column(
        db.Integer, db.ForeignKey("bakeries.id"), nullable=False, index=True
    )
    customer_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    rating = db.Column(db.Integer, nullable=False)  # ۱ تا ۵
    comment = db.Column(db.Text, nullable=False, default="")
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    bakery = db.relationship("Bakery", back_populates="reviews")
    customer = db.relationship("User", back_populates="reviews")

    def to_dict(self, include_customer=False):
        data = {
            "id": self.id,
            "bakery_id": self.bakery_id,
            "rating": self.rating,
            "comment": self.comment,
            "created_at": iso(self.created_at),
        }
        if include_customer:
            data["customer_name"] = self.customer.name if self.customer else ""
        return data
