import Link from "next/link";
import { RevenueByCategoryChart } from "@/components/analytics/revenue-by-category-chart";
import { RevenueByMonthChart } from "@/components/analytics/revenue-by-month-chart";
import { LogoutButton } from "@/components/auth/logout-button";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] px-5 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex items-center justify-between gap-5">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-700 font-bold text-white">
              N
            </span>
            <span className="text-sm font-semibold tracking-wide text-slate-900">
              NEOLYTIX LEARNING
            </span>
          </Link>
          <LogoutButton />
        </header>

        <div className="mb-7">
          <p className="text-sm font-medium text-slate-500">Overview</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            Dashboard
          </h1>
        </div>

        <div className="space-y-6">
          <RevenueByCategoryChart />
          <RevenueByMonthChart />
        </div>
      </div>
    </main>
  );
}
