import { createContext, useContext, useEffect, useState } from "react";
import type { LocalDate, Settings } from "../data/types";
import { getAll, subscribe, type DataStore, type StoreValue } from "./storage/db";

export interface AppState {
  settings: Settings;
  today: LocalDate;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
}

export const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

export type Loadable<T> = { status: "loading" } | { status: "error"; error: string } | { status: "ready"; data: T };

/** Reads a whole store and re-reads after any write anywhere in the app. */
export function useStore<S extends DataStore>(store: S): Loadable<StoreValue<S>[]> {
  const [state, setState] = useState<Loadable<StoreValue<S>[]>>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    const load = () =>
      getAll(store).then(
        (data) => alive && setState({ status: "ready", data }),
        (e: unknown) => alive && setState({ status: "error", error: e instanceof Error ? e.message : String(e) }),
      );
    load();
    const unsub = subscribe(load);
    return () => {
      alive = false;
      unsub();
    };
  }, [store]);
  return state;
}

export function dataOf<T>(l: Loadable<T[]>): T[] {
  return l.status === "ready" ? l.data : [];
}
