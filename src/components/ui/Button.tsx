import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500";

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  secondary: "bg-white text-gray-900 border border-gray-300 hover:bg-gray-50",
  ghost: "text-gray-700 hover:bg-gray-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-base",
};

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ className, variant = "primary", size = "md", ...props }, ref) {
  return <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />;
});
