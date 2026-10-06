import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in | Neolytix Learning",
  description: "Log in to continue your Neolytix Learning journey.",
};

export default function LoginPage() {
  return (
    <section className="w-full max-w-md">
      <div className="mb-8">
        <p className="text-sm font-semibold text-emerald-700">WELCOME BACK</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Log in to your account
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Pick up where you left off and keep moving toward your goals.
        </p>
      </div>
      <LoginForm />
    </section>
  );
}
