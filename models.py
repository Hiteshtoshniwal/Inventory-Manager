from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

CATEGORIES = ["oils", "kirana", "covers"]
CATEGORY_LABELS = {
    "oils": "Oils",
    "kirana": "Kirana",
    "covers": "Covers & Packing Material",
}


class InventoryItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(20), nullable=False)  # oils / kirana / covers
    name = db.Column(db.String(120), nullable=False)
    unit = db.Column(db.String(30), default="pcs")  # kg, litre, pcs, box, etc.
    quantity = db.Column(db.Float, default=0)
    price_per_unit = db.Column(db.Float, default=0)
    low_stock_threshold = db.Column(db.Float, default=0)
    notes = db.Column(db.String(255), default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "category": self.category,
            "category_label": CATEGORY_LABELS.get(self.category, self.category),
            "name": self.name,
            "unit": self.unit,
            "quantity": self.quantity,
            "price_per_unit": self.price_per_unit,
            "stock_value": round((self.quantity or 0) * (self.price_per_unit or 0), 2),
            "low_stock_threshold": self.low_stock_threshold,
            "low_stock": (self.quantity or 0) <= (self.low_stock_threshold or 0),
            "notes": self.notes,
            "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M") if self.updated_at else None,
        }


class Receivable(db.Model):
    """Money owed TO the vendor BY customers (credit sales / dues)."""
    id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(30), default="")
    total_amount = db.Column(db.Float, nullable=False, default=0)
    amount_paid = db.Column(db.Float, nullable=False, default=0)
    date_created = db.Column(db.DateTime, default=datetime.utcnow)
    due_date = db.Column(db.Date, nullable=True)
    notes = db.Column(db.String(255), default="")

    payments = db.relationship(
        "Payment", backref="receivable", cascade="all, delete-orphan", lazy=True
    )

    @property
    def balance(self):
        return round((self.total_amount or 0) - (self.amount_paid or 0), 2)

    @property
    def status(self):
        if self.balance <= 0:
            return "paid"
        if self.amount_paid > 0:
            return "partial"
        return "pending"

    def to_dict(self):
        return {
            "id": self.id,
            "customer_name": self.customer_name,
            "phone": self.phone,
            "total_amount": self.total_amount,
            "amount_paid": self.amount_paid,
            "balance": self.balance,
            "status": self.status,
            "date_created": self.date_created.strftime("%Y-%m-%d") if self.date_created else None,
            "due_date": self.due_date.strftime("%Y-%m-%d") if self.due_date else None,
            "notes": self.notes,
            "payments": [p.to_dict() for p in sorted(self.payments, key=lambda p: p.date, reverse=True)],
        }


class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    receivable_id = db.Column(db.Integer, db.ForeignKey("receivable.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    note = db.Column(db.String(255), default="")

    def to_dict(self):
        return {
            "id": self.id,
            "amount": self.amount,
            "date": self.date.strftime("%Y-%m-%d %H:%M") if self.date else None,
            "note": self.note,
        }
