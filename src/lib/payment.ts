export const PAYMENT_METHODS = [
  { id: "pay_on_delivery", label: "Pay on delivery" },
  { id: "card", label: "Card" },
  { id: "apple_pay", label: "Apple Pay" },
  { id: "google_pay", label: "Google Pay" },
] as const;

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];
export type CardBrand = "Visa" | "Mastercard" | "Amex" | "Card";
const CARD_BRANDS: readonly CardBrand[] = ["Visa", "Mastercard", "Amex", "Card"];

export function isPaymentMethodId(value: unknown): value is PaymentMethodId {
  return PAYMENT_METHODS.some((method) => method.id === value);
}

export function parsePaymentMethod(value: unknown): PaymentMethodId | null {
  return isPaymentMethodId(value) ? value : null;
}

export function cardDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function detectCardBrand(value: string): CardBrand {
  const digits = cardDigits(value);
  if (digits.startsWith("4")) return "Visa";
  if (/^5[1-5]/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  return "Card";
}

export function cardLast4(value: string): string | null {
  const digits = cardDigits(value);
  return digits.length >= 4 ? digits.slice(-4) : null;
}

export function isCardBrand(value: unknown): value is CardBrand {
  return typeof value === "string" && CARD_BRANDS.some((brand) => brand === value);
}

export function formatCardPaymentLabel({
  brand,
  last4,
}: {
  brand: CardBrand;
  last4: string;
}): string | null {
  if (!/^\d{4}$/.test(last4)) return null;
  return `Card · ${brand} ending ${last4}`;
}

export function paymentMethodLabel(method: PaymentMethodId): string {
  return PAYMENT_METHODS.find((option) => option.id === method)?.label ?? "Payment";
}

export function paymentStatusLabel(paymentMethod: string): "Paid (demo)" | "Due on delivery" {
  return paymentMethod === "Pay on delivery" ? "Due on delivery" : "Paid (demo)";
}
