import { useCallback, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { cn } from "../../lib/cn";
import {
  ToastContext,
  type ToastContextValue,
  type ToastInput,
  type ToastTone
} from "./toast-context";

interface Toast extends ToastInput {
  id: string;
  tone: ToastTone;
}

const toneStyles: Record<ToastTone, string> = {
  success: "border-green-200 bg-white",
  error: "border-red-200 bg-white",
  info: "border-slate-200 bg-white"
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>(
    (input) => {
      const { title, description, tone = "info" } = input;
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, title, description, tone }]);
      window.setTimeout(() => remove(id), 4500);
    },
    [remove]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-md border p-3 shadow-md",
              toneStyles[item.tone]
            )}
          >
            {item.tone === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            ) : item.tone === "error" ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{item.title}</p>
              {item.description ? (
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  {item.description}
                </p>
              ) : null}
            </div>
            <button
              onClick={() => remove(item.id)}
              className="rounded p-0.5 text-slate-400 hover:text-slate-600"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
