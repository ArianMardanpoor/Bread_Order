"""مدل نوع نون (سنگک، بربری، تافتون، لواش و ...)."""
from app.extensions import db


class BreadType(db.Model):
    __tablename__ = "bread_types"
    __table_args__ = (
        db.UniqueConstraint("bakery_id", "name", name="uq_bread_type_per_bakery"),
    )

    id = db.Column(db.Integer, primary_key=True)
    bakery_id = db.Column(
        db.Integer, db.ForeignKey("bakeries.id"), nullable=False, index=True
    )
    name = db.Column(db.String(50), nullable=False)
    # قیمت به تومان
    price = db.Column(db.Integer, nullable=False, default=0)

    bakery = db.relationship("Bakery", back_populates="bread_types")

    def to_dict(self):
        return {
            "id": self.id,
            "bakery_id": self.bakery_id,
            "name": self.name,
            "price": self.price,
        }
