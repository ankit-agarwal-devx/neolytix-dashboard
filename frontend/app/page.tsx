import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f5] px-6">
      <section className="max-w-lg text-center">
        <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-emerald-700 text-xl font-bold text-white">
          N
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
          Neolytix learning
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
          Make your next move a learning one.
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Create your account to explore courses and keep your learning journey
          in one place.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-700 px-6 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Log in to your dashboard
        </Link>
        <p className="mt-4 text-sm text-slate-600">
          New here?{" "}
          <Link
            href="/sign-up"
            className="font-semibold text-emerald-800 underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
