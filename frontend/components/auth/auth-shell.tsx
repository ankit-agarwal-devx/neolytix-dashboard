import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.9fr)]">
      <aside className="relative hidden overflow-hidden bg-[#102b24] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 top-20 size-[34rem] rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 top-40 size-[24rem] rounded-full border border-white/10"
        />
        <Link href="/" className="relative inline-flex w-fit items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-400 text-lg font-bold text-[#102b24]">
            N
          </span>
          <span className="text-sm font-semibold tracking-wide">
            NEOLYTIX LEARNING
          </span>
        </Link>

        <div className="relative max-w-xl py-16">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-emerald-300">
            Learn with direction
          </p>
          <h2 className="mt-6 text-5xl font-semibold leading-[1.12] tracking-tight xl:text-6xl">
            Turn your curiosity into your next opportunity.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
            Find courses that fit your goals, learn at your own pace, and keep
            every milestone in view.
          </p>
          <div className="mt-10 flex items-center gap-3 text-sm text-slate-300">
            <span aria-hidden="true" className="flex -space-x-2">
              <span className="size-8 rounded-full border-2 border-[#102b24] bg-emerald-200" />
              <span className="size-8 rounded-full border-2 border-[#102b24] bg-amber-200" />
              <span className="size-8 rounded-full border-2 border-[#102b24] bg-sky-200" />
            </span>
            <span>A better learning journey starts here.</span>
          </div>
        </div>

        <p className="relative text-xs text-slate-400">
          © {new Date().getFullYear()} Neolytix Learning
        </p>
      </aside>

      <div className="flex min-h-screen flex-col px-6 py-6 sm:px-10 lg:px-12 xl:px-20">
        <header className="mb-12 flex items-center justify-between lg:mb-0">
          <Link href="/" className="inline-flex items-center gap-2 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-700 font-bold text-white">
              N
            </span>
            <span className="text-xs font-semibold tracking-wide text-slate-800">
              NEOLYTIX LEARNING
            </span>
          </Link>
          <span className="hidden text-sm text-slate-500 lg:block">
            Your next chapter starts here
          </span>
        </header>
        <div className="flex flex-1 items-center justify-center py-4">
          {children}
        </div>
        <footer className="pt-8 text-center text-xs text-slate-400">
          Learn at your pace. Grow in your direction.
        </footer>
      </div>
    </main>
  );
}
