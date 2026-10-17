"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, AlertCircle } from "lucide-react";

type Toast = { id: number; message: string; kind: "success" | "error" };
const Context = createContext<(message: string, kind?: "success" | "error") => void>(() => {});
export const useToast = () => useContext(Context);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const show = useCallback((message: string, kind: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, message, kind }]);
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4800);
  }, []);
  return <Context.Provider value={show}>{children}<div className="toast-stack" role="region" aria-label="Notifications"><AnimatePresence>{items.map((item) => <motion.div key={item.id} layout initial={{ opacity: 0, x: 28, scale: .97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 24, scale: .97 }} transition={{ duration: .24 }} className={`toast ${item.kind}`} role="status"><span className="toast-icon">{item.kind === "success" ? <Check size={16} /> : <AlertCircle size={16} />}</span><span>{item.message}</span><button type="button" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} aria-label="Dismiss notification"><X size={16} /></button></motion.div>)}</AnimatePresence></div></Context.Provider>;
}
