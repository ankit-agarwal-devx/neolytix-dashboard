import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = {
  title: "Create your account | Neolytix Learning",
  description:
    "Create a Neolytix Learning account and start exploring courses.",
};

export default function SignUpPage() {
  return (
    <section className="w-full max-w-md">
      <div className="mb-8">
        <p className="text-sm font-semibold text-emerald-700">
          START LEARNING TODAY
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Create your account
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Sign up to discover courses and track your progress.
        </p>
      </div>
      <SignUpForm />
      <p className="mt-6 text-center text-xs leading-5 text-slate-500">
        Your account is created with the manager role. Choose the region you
        manage to see correctly scoped analytics.
      </p>
      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-emerald-700 underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </section>
  );
}
