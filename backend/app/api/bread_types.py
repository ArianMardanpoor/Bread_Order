"""اندپوینت‌های مدیریت انواع نون (فقط نانوا).

    POST   /api/bakeries/<id>/bread-types   افزودن نوع نون
    PUT    /api/bread-types/<id>            ویرایش نام/قیمت
    DELETE /api/bread-types/<id>            حذف
"""
from flask import g, jsonify

from app.api import api_bp
from app.core.auth import role_required
from app.core.errors import ApiError
from app.core.validators import as_int, get_json_body, require_str
from app.extensions import db
from app.models.bakery import Bakery
from app.models.bread_type import BreadType


def _get_owned_bakery(bakery_id):
    bakery = db.session.get(Bakery, bakery_id)
    if bakery is None:
        raise ApiError("نانوایی مورد نظر یافت نشد", 404)
    if bakery.owner_user_id != g.current_user.id:
        raise ApiError("این نانوایی متعلق به شما نیست", 403)
    return bakery


def _get_owned_bread_type(bread_type_id):
    bread_type = db.session.get(BreadType, bread_type_id)
    if bread_type is None:
        raise ApiError("نوع نون مورد نظر یافت نشد", 404)
    _get_owned_bakery(bread_type.bakery_id)
    return bread_type


@api_bp.route("/bakeries/<int:bakery_id>/bread-types", methods=["POST"])
@role_required("baker")
def create_bread_type(bakery_id):
    bakery = _get_owned_bakery(bakery_id)
    data = get_json_body()
    name = require_str(data.get("name"), "نام نوع نون", max_len=50)
    price = as_int(data.get("price"), "قیمت (تومان)", min_val=0, default=0)

    exists = BreadType.query.filter_by(bakery_id=bakery.id, name=name).first()
    if exists:
        raise ApiError("این نوع نون قبلاً برای نانوایی ثبت شده است", 409)

    bread_type = BreadType(bakery_id=bakery.id, name=name, price=price or 0)
    db.session.add(bread_type)
    db.session.commit()
    return jsonify(bread_type.to_dict()), 201


@api_bp.route("/bread-types/<int:bread_type_id>", methods=["PUT"])
@role_required("baker")
def update_bread_type(bread_type_id):
    bread_type = _get_owned_bread_type(bread_type_id)
    data = get_json_body()

    if "name" in data:
        name = require_str(data.get("name"), "نام نوع نون", max_len=50)
        duplicate = BreadType.query.filter(
            BreadType.bakery_id == bread_type.bakery_id,
            BreadType.name == name,
            BreadType.id != bread_type.id,
        ).first()
        if duplicate:
            raise ApiError("این نوع نون قبلاً برای نانوایی ثبت شده است", 409)
        bread_type.name = name
    if data.get("price") is not None:
        bread_type.price = as_int(data.get("price"), "قیمت (تومان)", min_val=0, default=0)

    db.session.commit()
    return jsonify(bread_type.to_dict())


@api_bp.route("/bread-types/<int:bread_type_id>", methods=["DELETE"])
@role_required("baker")
def delete_bread_type(bread_type_id):
    bread_type = _get_owned_bread_type(bread_type_id)
    db.session.delete(bread_type)
    db.session.commit()
    return jsonify({"message": "نوع نون حذف شد"})
