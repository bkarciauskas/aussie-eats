export type DemoCapability = "debug" | "review" | "agent";

export type DemoScenarioId = string & { readonly __brand: "DemoScenarioId" };

export type DemoScenario = {
  id: DemoScenarioId;
  capability: DemoCapability;
  title: string;
  summary: string;
  reproduce: string[];
};

const DEMO_SCENARIO_ID_VALUES = ["cart-subtotal-ignores-qty"] as const;
type DemoScenarioIdValue = (typeof DEMO_SCENARIO_ID_VALUES)[number];

const SCENARIO_ID_SET = new Set<string>(DEMO_SCENARIO_ID_VALUES);

export function isDemoScenarioId(value: string): value is DemoScenarioId {
  return SCENARIO_ID_SET.has(value);
}

export function parseDemoScenarioId(value: unknown): DemoScenarioId | null {
  if (typeof value !== "string") return null;
  if (!isDemoScenarioId(value)) return null;
  return value;
}

function requireDemoScenarioId(value: DemoScenarioIdValue): DemoScenarioId {
  const parsed = parseDemoScenarioId(value);
  if (!parsed) {
    throw new Error(`unknown demo scenario id: ${value}`);
  }
  return parsed;
}

export const CART_SUBTOTAL_IGNORES_QTY = requireDemoScenarioId("cart-subtotal-ignores-qty");

export const DEMO_SCENARIOS: readonly DemoScenario[] = [
  {
    id: CART_SUBTOTAL_IGNORES_QTY,
    capability: "debug",
    title: "Cart subtotal skips quantity",
    summary:
      "The cart adds each line's unit price once, no matter the quantity. Line items still show unit × qty. The placed order uses the menu price × quantity from Mongo.",
    reproduce: [
      "Add a menu item and set the quantity to 2.",
      "Open the cart. Subtotal matches one unit, not two.",
      "Place the order. The confirmation total uses the real line math.",
      "Ask Cursor Debug why the cart total and the order total disagree.",
      "Turn this off. The same cart items total correctly.",
    ],
  },
];

export function scenarioById(id: DemoScenarioId): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((scenario) => scenario.id === id);
}
