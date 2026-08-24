import { isDemoScenarioId, type DemoScenarioId } from "./scenarios";

export const DEMO_STORAGE_KEY = "aussieeats_demo_v1";
export const DEMO_STATE_EVENT = "aussieeats-demo-change";

export type DemoState = {
  enabled: ReadonlySet<DemoScenarioId>;
};

export function emptyDemoState(): DemoState {
  return { enabled: new Set() };
}

export function parseDemoState(raw: unknown): DemoState {
  if (typeof raw !== "object" || raw === null || !("enabled" in raw)) {
    return emptyDemoState();
  }
  const enabledRaw = raw.enabled;
  if (!Array.isArray(enabledRaw)) {
    return emptyDemoState();
  }
  const enabled = new Set<DemoScenarioId>();
  for (const value of enabledRaw) {
    if (typeof value === "string" && isDemoScenarioId(value)) {
      enabled.add(value);
    }
  }
  return { enabled };
}

export function serializeDemoState(state: DemoState): string {
  return JSON.stringify({ enabled: [...state.enabled] });
}

export function readDemoState(storage: Pick<Storage, "getItem">): DemoState {
  try {
    const raw = storage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return emptyDemoState();
    return parseDemoState(JSON.parse(raw) as unknown);
  } catch {
    return emptyDemoState();
  }
}

export function writeDemoState(
  storage: Pick<Storage, "setItem">,
  state: DemoState,
): void {
  storage.setItem(DEMO_STORAGE_KEY, serializeDemoState(state));
}

export function isScenarioEnabled(state: DemoState, id: DemoScenarioId): boolean {
  return state.enabled.has(id);
}

export function withScenarioEnabled(
  state: DemoState,
  id: DemoScenarioId,
  enabled: boolean,
): DemoState {
  const next = new Set(state.enabled);
  if (enabled) next.add(id);
  else next.delete(id);
  return { enabled: next };
}
