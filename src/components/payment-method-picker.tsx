"use client";

import {
  PAYMENT_METHODS,
  PaymentMethodId,
  cardDigits,
  detectCardBrand,
} from "@/lib/payment";

type Props = {
  method: PaymentMethodId;
  cardNumber: string;
  onMethodChange: (method: PaymentMethodId) => void;
  onCardNumberChange: (number: string) => void;
};

export function PaymentMethodPicker({
  method,
  cardNumber,
  onMethodChange,
  onCardNumberChange,
}: Props) {
  const cardBrand = detectCardBrand(cardNumber);

  return (
    <fieldset className="space-y-3">
      <legend className="font-display text-2xl">Payment</legend>
      <p className="text-sm text-[var(--ae-ink-muted)]">Demo only — no charge will be made.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {PAYMENT_METHODS.map((option) => (
          <label
            key={option.id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
              method === option.id
                ? "border-[var(--ae-green)] bg-[var(--ae-cream)]"
                : "border-[var(--ae-line)]"
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={option.id}
              checked={method === option.id}
              onChange={() => onMethodChange(option.id)}
            />
            <span className="font-semibold">{option.label}</span>
          </label>
        ))}
      </div>

      {method === "card" ? (
        <div className="mt-4 grid gap-4 rounded-lg border border-[var(--ae-line)] bg-[var(--ae-cream)] p-4 sm:grid-cols-2">
          <label className="field sm:col-span-2">
            <span>Card number</span>
            <input
              inputMode="numeric"
              autoComplete="cc-number"
              value={cardNumber}
              onChange={(event) => onCardNumberChange(event.target.value)}
              required
              minLength={12}
              maxLength={23}
              placeholder="4242 4242 4242 4242"
              aria-describedby="card-brand"
            />
            <small id="card-brand" className="text-[var(--ae-ink-muted)]">
              {cardDigits(cardNumber) ? `${cardBrand} · mock card` : "Use any demo card number"}
            </small>
          </label>
          <label className="field sm:col-span-2">
            <span>Name on card</span>
            <input autoComplete="cc-name" required placeholder="Taylor Smith" />
          </label>
          <label className="field">
            <span>Expiry</span>
            <input
              inputMode="numeric"
              autoComplete="cc-exp"
              required
              pattern="(0[1-9]|1[0-2])/[0-9]{2}"
              placeholder="MM/YY"
              title="Enter expiry as MM/YY"
            />
          </label>
          <label className="field">
            <span>CVC</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="cc-csc"
              required
              pattern="[0-9]{3,4}"
              maxLength={4}
              placeholder="123"
              title="Enter a 3 or 4 digit CVC"
            />
          </label>
        </div>
      ) : null}
    </fieldset>
  );
}
