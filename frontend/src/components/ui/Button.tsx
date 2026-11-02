import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "border-transparent bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600",
  secondary:
    "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-blue-600",
  ghost:
    "border-transparent bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-blue-600",
  danger:
    "border-transparent bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600"
};

const sizes: Record<Size, string> = {
  md: "h-9 px-3.5 text-sm",
  sm: "h-8 px-3 text-xs",
  icon: "h-9 w-9 p-0"
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
