import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "block w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none",
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "block w-full min-h-[80px] px-3 py-2 rounded-md border border-gray-300 bg-white text-sm shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none",
          className,
        )}
        {...props}
      />
    );
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "block w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm shadow-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
