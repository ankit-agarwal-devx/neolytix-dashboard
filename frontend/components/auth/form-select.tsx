import type { SelectHTMLAttributes } from "react";

type FormSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: readonly string[];
  placeholder: string;
};

export function FormSelect({
  label,
  options,
  placeholder,
  id,
  name,
  className,
  ...selectProps
}: FormSelectProps) {
  const selectId = id ?? name;

  return (
    <div>
      <label
        htmlFor={selectId}
        className="mb-2 block text-sm font-medium text-slate-800"
      >
        {label}
      </label>
      <select
        {...selectProps}
        id={selectId}
        name={name}
        className={`min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 ${className ?? ""}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
