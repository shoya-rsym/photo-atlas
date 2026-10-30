"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "photo-atlas:memory-enabled";

type MemoryPreference = {
  enabled: boolean;
  ready: boolean;
  toggle: () => void;
  error: string | null;
};

const MemoryPreferenceContext = createContext<MemoryPreference | null>(null);

export function MemoryPreferenceProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [enabled, setEnabled] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setEnabled(window.localStorage.getItem(STORAGE_KEY) !== "false");
    } catch (cause) {
      console.error("余白の表示設定を読み込めませんでした", cause);
      setError("余白の表示設定を読み込めませんでした");
    } finally {
      setReady(true);
    }
  }, []);

  const toggle = useCallback(() => {
    const next = !enabled;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
      setEnabled(next);
      setError(null);
    } catch (cause) {
      console.error("余白の表示設定を保存できませんでした", cause);
      setError("余白の表示設定を保存できませんでした");
    }
  }, [enabled]);

  const value = useMemo(
    () => ({ enabled, ready, toggle, error }),
    [enabled, ready, toggle, error],
  );

  return (
    <MemoryPreferenceContext.Provider value={value}>
      {children}
    </MemoryPreferenceContext.Provider>
  );
}

export function useMemoryPreference() {
  const value = useContext(MemoryPreferenceContext);
  if (!value) {
    throw new Error(
      "MemoryPreferenceProvider の内側で利用してください",
    );
  }
  return value;
}

export function MemorySetting({ compact = false }: { compact?: boolean }) {
  const { enabled, ready, toggle, error } = useMemoryPreference();

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        aria-pressed={enabled}
        disabled={!ready}
        onClick={toggle}
        className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/75 transition hover:border-sky-300/50 hover:text-white disabled:opacity-50"
      >
        {compact
          ? `💭 余白 ${enabled ? "ON" : "OFF"}`
          : `余白表示 ${enabled ? "ON" : "OFF"}`}
      </button>
      {error ? (
        <span role="alert" className="text-xs text-rose-300">
          {error}
        </span>
      ) : null}
    </span>
  );
}
