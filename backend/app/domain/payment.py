"""Payment method labels (ported from src/lib/payment.ts)."""

from __future__ import annotations

from typing import Literal, Optional

PAYMENT_METHODS = (
    ("pay_on_delivery", "Pay on delivery"),
    ("card", "Card"),
    ("apple_pay", "Apple Pay"),
    ("google_pay", "Google Pay"),
)

PaymentMethodId = Literal["pay_on_delivery", "card", "apple_pay", "google_pay"]
CardBrand = Literal["Visa", "Mastercard", "Amex", "Card"]

_CARD_BRANDS = frozenset({"Visa", "Mastercard", "Amex", "Card"})
_METHOD_IDS = frozenset(method_id for method_id, _ in PAYMENT_METHODS)
_METHOD_LABELS = dict(PAYMENT_METHODS)


def parse_payment_method(value: object) -> Optional[PaymentMethodId]:
    if isinstance(value, str) and value in _METHOD_IDS:
        return value  # type: ignore[return-value]
    return None


def is_card_brand(value: object) -> bool:
    return isinstance(value, str) and value in _CARD_BRANDS


def format_card_payment_label(*, brand: str, last4: str) -> Optional[str]:
    if not isinstance(last4, str) or len(last4) != 4 or not last4.isdigit():
        return None
    if not is_card_brand(brand):
        return None
    return f"Card · {brand} ending {last4}"


def payment_method_label(method: PaymentMethodId) -> str:
    return _METHOD_LABELS.get(method, "Payment")
