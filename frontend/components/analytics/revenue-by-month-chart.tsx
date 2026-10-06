"use client";

import { useCallback, useEffect, useState } from "react";
import { FormSelect } from "@/components/auth/form-select";

interface MonthlyRevenue {
  month: string;
  totalRevenue: number;
}

interface MonthlyRevenueResponse {
  role: "admin" | "manager";
  region: string | null;
  data: MonthlyRevenue[];
}

interface ApiError {
  message?: string | string[];
}

const REGIONS = ["North", "South", "East", "West", "Central"] as const;

const CHART = {
  height: 360,
  margin: { top: 24, right: 18, bottom: 76, left: 76 },
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

const monthFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

function formatRevenue(value: number): string {
  return currencyFormatter.format(value);
}

function formatMonth(value: string): string {
  return monthFormatter.format(new Date(`${value}-01T00:00:00Z`));
}

function isMonthlyRevenueData(value: unknown): value is MonthlyRevenue[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "month" in item &&
        typeof item.month === "string" &&
        /^\d{4}-(0[1-9]|1[0-2])$/.test(item.month) &&
        "totalRevenue" in item &&
        typeof item.totalRevenue === "number" &&
        Number.isFinite(item.totalRevenue) &&
        item.totalRevenue >= 0,
    )
  );
}

function isMonthlyRevenueResponse(
  value: unknown,
): value is MonthlyRevenueResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "role" in value &&
    (value.role === "admin" || value.role === "manager") &&
    "region" in value &&
    (typeof value.region === "string" || value.region === null) &&
    "data" in value &&
    isMonthlyRevenueData(value.data)
  );
}

function getErrorMessage(payload: ApiError, fallback: string): string {
  if (Array.isArray(payload.message)) {
    return payload.message.join(" ");
  }
  return payload.message ?? fallback;
}

function MonthlyRevenueChart({ data }: { data: MonthlyRevenue[] }) {
  const width = Math.max(760, data.length * 72 + 96);
  const plotWidth = width - CHART.margin.left - CHART.margin.right;
  const plotHeight = CHART.height - CHART.margin.top - CHART.margin.bottom;
  const maxRevenue = Math.max(
    ...data.map(({ totalRevenue }) => totalRevenue),
    0,
  );
  const axisMax = maxRevenue > 0 ? maxRevenue : 1;
  const tickCount = 4;
  const slotWidth = plotWidth / data.length;
  const barWidth = Math.min(48, slotWidth * 0.58);

  return (
    <div className="overflow-x-auto">
      <svg
        aria-label="Bar chart of total revenue by month"
        className="h-auto w-full min-w-[560px]"
        role="img"
        style={{ minWidth: `${width}px` }}
        viewBox={`0 0 ${width} ${CHART.height}`}
      >
        {Array.from({ length: tickCount + 1 }, (_, index) => {
          const value = (axisMax / tickCount) * index;
          const y =
            CHART.margin.top + plotHeight - (plotHeight / tickCount) * index;

          return (
            <g key={index}>
              <line
                x1={CHART.margin.left}
                x2={width - CHART.margin.right}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray={index === 0 ? undefined : "4 5"}
              />
              <text
                x={CHART.margin.left - 12}
                y={y + 4}
                fill="#64748b"
                fontSize="11"
                textAnchor="end"
              >
                {formatRevenue(value)}
              </text>
            </g>
          );
        })}

        {data.map(({ month, totalRevenue }, index) => {
          const barHeight = (totalRevenue / axisMax) * plotHeight;
          const x =
            CHART.margin.left + slotWidth * index + (slotWidth - barWidth) / 2;
          const y = CHART.margin.top + plotHeight - barHeight;

          return (
            <g key={month}>
              <title>{`${formatMonth(month)}: ${formatRevenue(totalRevenue)}`}</title>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="7"
                fill="#047857"
              />
              <text
                x={x + barWidth / 2}
                y={Math.max(y - 9, CHART.margin.top + 12)}
                fill="#334155"
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
              >
                {formatRevenue(totalRevenue)}
              </text>
              <text
                x={x + barWidth / 2}
                y={CHART.height - CHART.margin.bottom + 23}
                fill="#475569"
                fontSize="11"
                textAnchor="middle"
              >
                {formatMonth(month)}
              </text>
            </g>
          );
        })}

        <text
          fill="#64748b"
          fontSize="11"
          textAnchor="middle"
          transform={`translate(18 ${CHART.margin.top + plotHeight / 2}) rotate(-90)`}
        >
          Total revenue
        </text>
      </svg>
    </div>
  );
}

export function RevenueByMonthChart() {
  const [result, setResult] = useState<MonthlyRevenueResponse | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => {
    setError("");
    setLoading(true);
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRevenue() {
      setLoading(true);
      setError("");

      try {
        const searchParams = new URLSearchParams();
        if (selectedRegion) {
          searchParams.set("region", selectedRegion);
        }
        if (selectedYear) {
          searchParams.set("year", selectedYear);
        }
        const query = searchParams.size > 0 ? `?${searchParams}` : "";
        const response = await fetch(
          `/api/analytics/revenue-by-month${query}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const payload: unknown = await response.json();

        if (!response.ok) {
          setError(
            getErrorMessage(
              payload as ApiError,
              "We couldn't load monthly revenue analytics.",
            ),
          );
          setResult(null);
          return;
        }

        if (!isMonthlyRevenueResponse(payload)) {
          setError(
            "The analytics service returned data in an unexpected format.",
          );
          setResult(null);
          return;
        }

        setResult(payload);
        if (payload.data.length > 0) {
          setAvailableYears((currentYears) =>
            Array.from(
              new Set([
                ...currentYears,
                ...payload.data.map(({ month }) => month.slice(0, 4)),
              ]),
            ).sort((left, right) => right.localeCompare(left)),
          );
        }
      } catch {
        if (!controller.signal.aborted) {
          setError(
            "We couldn't reach the analytics service. Please try again.",
          );
          setResult(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadRevenue();
    return () => controller.abort();
  }, [reloadKey, selectedRegion, selectedYear]);

  return (
    <section
      aria-labelledby="monthly-revenue-widget-title"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Revenue trends
          </p>
          <h2
            id="monthly-revenue-widget-title"
            className="mt-2 text-xl font-semibold tracking-tight text-slate-950"
          >
            Monthly revenue
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Sum of enrollment fees by enrollment month
          </p>
        </div>
        {/* <div className="flex flex-wrap items-end gap-4">
          {availableYears.length > 0 && (
            <div className="w-40">
              <FormSelect
                aria-label="Filter monthly revenue by year"
                label="Year filter"
                name="monthly-revenue-year"
                onChange={(event) => {
                  setLoading(true);
                  setSelectedYear(event.target.value);
                }}
                options={availableYears}
                placeholder="All years"
                value={selectedYear}
              />
            </div>
          )}
          {result?.role === "admin" && (
            <div className="w-48">
              <FormSelect
                aria-label="Filter monthly revenue by region"
                label="Region filter"
                name="monthly-revenue-region"
                onChange={(event) => {
                  setLoading(true);
                  setSelectedRegion(event.target.value);
                }}
                options={REGIONS}
                placeholder="All regions"
                value={selectedRegion}
              />
            </div>
          )}
          {result && result.data.length > 0 && (
            <p className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
              {result.data.length}{" "}
              {result.data.length === 1 ? "month" : "months"}
            </p>
          )}
        </div> */}
      </div>

      {loading && (
        <div
          aria-label="Loading monthly revenue"
          className="h-72 animate-pulse rounded-xl bg-slate-50"
          role="status"
        />
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-800" role="alert">
            {error}
          </p>
          <button
            className="mt-4 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-900 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            onClick={retry}
            type="button"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && result?.data.length === 0 && (
        <p className="rounded-xl bg-slate-50 px-5 py-12 text-center text-sm text-slate-600">
          No monthly enrollment revenue is available yet.
        </p>
      )}

      {!loading && !error && result && result.data.length > 0 && (
        <MonthlyRevenueChart data={result.data} />
      )}
    </section>
  );
}
