from app.domain.orders import (
    ALLOWED_TRANSITIONS,
    can_transition,
    parse_order_line_quantity,
)
from app.models import OrderStatus


def test_allowed_transitions_match_storefront_rules():
    assert ALLOWED_TRANSITIONS[OrderStatus.pending] == [
        OrderStatus.preparing,
        OrderStatus.cancelled,
    ]
    assert ALLOWED_TRANSITIONS[OrderStatus.preparing] == [
        OrderStatus.out_for_delivery,
        OrderStatus.cancelled,
    ]
    assert ALLOWED_TRANSITIONS[OrderStatus.out_for_delivery] == [
        OrderStatus.delivered,
        OrderStatus.cancelled,
    ]
    assert ALLOWED_TRANSITIONS[OrderStatus.delivered] == []
    assert ALLOWED_TRANSITIONS[OrderStatus.cancelled] == []


def test_can_transition_rejects_skips_and_terminals():
    assert can_transition(OrderStatus.pending, OrderStatus.preparing)
    assert not can_transition(OrderStatus.pending, OrderStatus.delivered)
    assert not can_transition(OrderStatus.delivered, OrderStatus.pending)
    assert not can_transition(OrderStatus.cancelled, OrderStatus.preparing)


def test_parse_order_line_quantity():
    assert parse_order_line_quantity(1) == 1
    assert parse_order_line_quantity(1.9) == 1
    assert parse_order_line_quantity(0) is None
    assert parse_order_line_quantity(100) is None
    assert parse_order_line_quantity("nope") is None
