"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEMO_SCENARIOS, type DemoScenario, type DemoScenarioId } from "@/lib/demo/scenarios";
import {
  DEMO_STORAGE_KEY,
  emptyDemoState,
  isScenarioEnabled,
  readDemoState,
  withScenarioEnabled,
  writeDemoState,
  type DemoState,
} from "@/lib/demo/state";

type DemoContextValue = {
  hydrated: boolean;
  isEnabled: (id: DemoScenarioId) => boolean;
  setScenarioEnabled: (id: DemoScenarioId, enabled: boolean) => void;
  clearAll: () => void;
  enabledScenarios: DemoScenario[];
};

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(emptyDemoState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readDemoState(localStorage));
    setHydrated(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== DEMO_STORAGE_KEY) return;
      setState(readDemoState(localStorage));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeDemoState(localStorage, state);
  }, [state, hydrated]);

  const setScenarioEnabled = useCallback((id: DemoScenarioId, enabled: boolean) => {
    setState((prev) => withScenarioEnabled(prev, id, enabled));
  }, []);

  const clearAll = useCallback(() => {
    setState(emptyDemoState());
  }, []);

  const isEnabled = useCallback(
    (id: DemoScenarioId) => isScenarioEnabled(state, id),
    [state],
  );

  const enabledScenarios = useMemo(
    () => DEMO_SCENARIOS.filter((scenario) => state.enabled.has(scenario.id)),
    [state],
  );

  const value = useMemo(
    () => ({ hydrated, isEnabled, setScenarioEnabled, clearAll, enabledScenarios }),
    [hydrated, isEnabled, setScenarioEnabled, clearAll, enabledScenarios],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider");
  return ctx;
}

export function useDemoEnabled(id: DemoScenarioId): boolean {
  const { hydrated, isEnabled } = useDemo();
  return hydrated && isEnabled(id);
}
