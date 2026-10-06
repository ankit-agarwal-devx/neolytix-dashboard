import type { InputHTMLAttributes, ReactNode } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  trailing?: ReactNode;
};

export function FormField({
  label,
  hint,
  error,
  trailing,
  id,
  className,
  ...inputProps
}: FormFieldProps) {
  const inputId = id ?? inputProps.name;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-slate-800"
        >
          {label}
        </label>
        {trailing}
      </div>
      <input
        {...inputProps}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [error ? undefined : hintId, errorId].filter(Boolean).join(" ") ||
          undefined
        }
        className={`min-h-12 w-full rounded-xl border bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 ${
          error ? "border-red-400" : "border-slate-200"
        } ${className ?? ""}`}
      />
      {hint && !error && (
        <p id={hintId} className="mt-2 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
