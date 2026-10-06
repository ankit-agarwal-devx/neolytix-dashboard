"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "./form-field";
import { FormSelect } from "./form-select";

const REGIONS = ["North", "South", "East", "West", "Central"] as const;

type ApiError = {
  message?: string | string[];
};

function getErrorMessage(payload: ApiError, fallback: string): string {
  if (Array.isArray(payload.message)) {
    return payload.message.join(" ");
  }
  return payload.message ?? fallback;
}

export function SignUpForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const region = String(formData.get("region") ?? "").trim();
    const body = {
      email: String(formData.get("email") ?? ""),
      password,
      ...(region ? { region } : {}),
    };

    setPending(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as ApiError;

      if (!response.ok) {
        setError(
          getErrorMessage(payload, "We couldn't create your account. Try again."),
        );
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setError("We couldn't reach the signup service. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField
        label="Email address"
        name="email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        required
        maxLength={254}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={72}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        hint="Use 8–72 characters."
      />
      <FormField
        label="Confirm password"
        name="confirm-password"
        type="password"
        placeholder="Enter your password again"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={72}
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
      />
      <FormSelect
        label="Region"
        name="region"
        options={REGIONS}
        placeholder="Select your region"
        required
      />

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-xs leading-5 text-slate-500">
        By creating an account, you agree to use the platform responsibly.
      </p>
    </form>
  );
}
