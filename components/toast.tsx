"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Icon } from "@/components/icons";

type ToastType = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const ToastContext = createContext<{
  push: (message: string, type?: ToastType) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Date.now() + Math.random();
      setItems((current) => [...current, { id, message, type }]);
      if (type !== "error") {
        window.setTimeout(() => remove(id), 5000);
      }
    },
    [remove],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-root" role="status" aria-live="polite" aria-atomic="false">
        {items.map((item) => (
          <div key={item.id} className={`toast toast-${item.type}`}>
            <Icon name={item.type === "error" ? "alert" : item.type === "success" ? "check" : "info"} />
            <div>{item.message}</div>
            <button type="button" onClick={() => remove(item.id)} aria-label="Tutup notifikasi">
              <Icon name="x" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast harus dipakai di dalam ToastProvider");
  return context;
}
