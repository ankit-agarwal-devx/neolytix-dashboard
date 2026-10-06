import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from '../auth/auth-user.js';
import type { MonthlyRevenueFilterDto } from './dto/monthly-revenue-filter.dto.js';
import type { RevenueFilterDto } from './dto/revenue-filter.dto.js';

export interface RevenueByCategory {
  category: string;
  totalRevenue: number;
}

export interface RevenueByCategoryResponse {
  role: 'admin' | 'manager';
  region: string | null;
  data: RevenueByCategory[];
}

export interface MonthlyRevenue {
  month: string;
  totalRevenue: number;
}

export interface MonthlyRevenueResponse {
  role: 'admin' | 'manager';
  region: string | null;
  data: MonthlyRevenue[];
}

interface AnalyticsScope {
  role: 'admin' | 'manager';
  region: string | null;
}

const REGIONS = ['North', 'South', 'East', 'West', 'Central'];

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRevenueByCategory(
    user: AuthUser,
    filter: RevenueFilterDto = {},
  ): Promise<RevenueByCategoryResponse> {
    const { role, region } = this.resolveScope(user, filter);

    const revenueSum = region
      ? Prisma.sql`SUM(e.fee_paid) FILTER (WHERE s.region = ${region})`
      : Prisma.sql`SUM(e.fee_paid)`;

    const data = await this.prisma.$queryRaw<RevenueByCategory[]>(Prisma.sql`
      SELECT
        c.category AS "category",
        COALESCE(${revenueSum}, 0)::DOUBLE PRECISION AS "totalRevenue"
      FROM "courses" c
      LEFT JOIN "enrollments" e ON e.course_id = c.id
      LEFT JOIN "students" s ON s.id = e.student_id
      GROUP BY c.category
      ORDER BY c.category
    `);

    return { role, region, data };
  }

  async getRevenueByMonth(
    user: AuthUser,
    filter: MonthlyRevenueFilterDto = {},
  ): Promise<MonthlyRevenueResponse> {
    const { role, region } = this.resolveScope(user, filter);
    const conditions: Prisma.Sql[] = [];
    if (region) {
      conditions.push(Prisma.sql`s.region = ${region}`);
    }
    if (filter.year) {
      const yearStart = new Date(Date.UTC(Number(filter.year), 0, 1));
      const nextYearStart = new Date(Date.UTC(Number(filter.year) + 1, 0, 1));
      conditions.push(
        Prisma.sql`e.enrolled_on >= ${yearStart}`,
        Prisma.sql`e.enrolled_on < ${nextYearStart}`,
      );
    }
    const whereClause = conditions.length
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.empty;
    const startMonth = filter.year
      ? Prisma.sql`${new Date(Date.UTC(Number(filter.year), 0, 1))}::timestamp`
      : Prisma.sql`COALESCE(
          DATE_TRUNC('year', MIN(enrolled_on)),
          DATE_TRUNC('year', CURRENT_DATE)
        )`;
    const endMonth = filter.year
      ? Prisma.sql`${new Date(Date.UTC(Number(filter.year) + 1, 0, 1))}::timestamp - INTERVAL '1 month'`
      : Prisma.sql`DATE_TRUNC(
          'year',
          GREATEST(MAX(enrolled_on), CURRENT_DATE)
        ) + INTERVAL '11 months'`;

    const data = await this.prisma.$queryRaw<MonthlyRevenue[]>(Prisma.sql`
      WITH scoped_enrollments AS (
        SELECT e.enrolled_on, e.fee_paid
        FROM "enrollments" e
        JOIN "students" s ON s.id = e.student_id
        ${whereClause}
      ),
      month_bounds AS (
        SELECT ${startMonth} AS start_month, ${endMonth} AS end_month
        FROM scoped_enrollments
      ),
      months AS (
        SELECT generate_series(
          start_month,
          end_month,
          INTERVAL '1 month'
        ) AS month_start
        FROM month_bounds
      ),
      monthly_revenue AS (
        SELECT
          DATE_TRUNC('month', enrolled_on) AS month_start,
          SUM(fee_paid) AS total_revenue
        FROM scoped_enrollments
        GROUP BY DATE_TRUNC('month', enrolled_on)
      )
      SELECT
        TO_CHAR(months.month_start, 'YYYY-MM') AS "month",
        COALESCE(monthly_revenue.total_revenue, 0)::DOUBLE PRECISION
          AS "totalRevenue"
      FROM months
      LEFT JOIN monthly_revenue USING (month_start)
      ORDER BY months.month_start
    `);

    return { role, region, data };
  }

  private resolveScope(
    user: AuthUser,
    filter: RevenueFilterDto,
  ): AnalyticsScope {
    if (user.role !== 'admin' && user.role !== 'manager') {
      throw new ForbiddenException('This role cannot view revenue analytics');
    }

    if (user.role === 'manager') {
      if (!user.region) {
        throw new ForbiddenException(
          'A region must be assigned to view manager analytics',
        );
      }
      return { role: user.role, region: user.region };
    }

    if (filter.region && !REGIONS.includes(filter.region)) {
      throw new BadRequestException('The selected region is not supported');
    }

    return { role: user.role, region: filter.region ?? null };
  }
}
