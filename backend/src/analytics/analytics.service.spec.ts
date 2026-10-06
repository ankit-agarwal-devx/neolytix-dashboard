import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from '../auth/auth-user.js';
import { AnalyticsService } from './analytics.service.js';

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let queryRaw: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    queryRaw = vi
      .fn()
      .mockResolvedValue([{ category: 'Programming', totalRevenue: 12000 }]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: { $queryRaw: queryRaw },
        },
      ],
    }).compile();

    analyticsService = module.get(AnalyticsService);
  });

  it('does not restrict admin revenue to a region', async () => {
    const result = await analyticsService.getRevenueByCategory({
      id: 1,
      role: 'admin',
      region: null,
    });

    expect(result).toEqual({
      role: 'admin',
      region: null,
      data: [{ category: 'Programming', totalRevenue: 12000 }],
    });
    expect(queryRaw.mock.calls[0][0].values).toEqual([]);
  });

  it('uses the manager region and ignores a requested region', async () => {
    const result = await analyticsService.getRevenueByCategory(
      { id: 2, role: 'manager', region: 'South' },
      { region: 'North' },
    );

    expect(queryRaw.mock.calls[0][0].values).toContain('South');
    expect(queryRaw.mock.calls[0][0].values).not.toContain('North');
    expect(queryRaw.mock.calls[0][0].sql).toContain('FILTER (WHERE s.region =');
    expect(result).toMatchObject({ role: 'manager', region: 'South' });
  });

  it('filters admin revenue to a requested region', async () => {
    const result = await analyticsService.getRevenueByCategory(
      { id: 1, role: 'admin', region: null },
      { region: 'North' },
    );

    expect(queryRaw.mock.calls[0][0].values).toContain('North');
    expect(result).toMatchObject({ role: 'admin', region: 'North' });
  });

  it('returns monthly revenue for all regions for an admin', async () => {
    queryRaw.mockResolvedValue([{ month: '2025-01', totalRevenue: 17000 }]);

    const result = await analyticsService.getRevenueByMonth({
      id: 1,
      role: 'admin',
      region: null,
    });

    expect(result).toEqual({
      role: 'admin',
      region: null,
      data: [{ month: '2025-01', totalRevenue: 17000 }],
    });
    expect(queryRaw.mock.calls[0][0].sql).toContain(
      "DATE_TRUNC('month', enrolled_on)",
    );
    expect(queryRaw.mock.calls[0][0].sql).toContain('generate_series(');
    expect(queryRaw.mock.calls[0][0].values).toEqual([]);
  });

  it('scopes monthly revenue to the manager region, ignoring requested regions', async () => {
    queryRaw.mockResolvedValue([{ month: '2025-01', totalRevenue: 8000 }]);

    const result = await analyticsService.getRevenueByMonth(
      { id: 2, role: 'manager', region: 'South' },
      { region: 'North' },
    );

    expect(result).toMatchObject({ role: 'manager', region: 'South' });
    expect(result.data).toEqual([{ month: '2025-01', totalRevenue: 8000 }]);
    expect(queryRaw.mock.calls[0][0].values).toContain('South');
    expect(queryRaw.mock.calls[0][0].values).not.toContain('North');
    expect(queryRaw.mock.calls[0][0].sql).toContain('WHERE s.region =');
  });

  it('filters monthly revenue to the requested year', async () => {
    queryRaw.mockResolvedValue([{ month: '2025-01', totalRevenue: 17000 }]);

    const result = await analyticsService.getRevenueByMonth(
      { id: 1, role: 'admin', region: null },
      { year: '2025' },
    );

    expect(result.data).toEqual([{ month: '2025-01', totalRevenue: 17000 }]);
    expect(queryRaw.mock.calls[0][0].values).toContainEqual(
      new Date(Date.UTC(2025, 0, 1)),
    );
    expect(queryRaw.mock.calls[0][0].values).toContainEqual(
      new Date(Date.UTC(2026, 0, 1)),
    );
    expect(queryRaw.mock.calls[0][0].sql).toContain('e.enrolled_on >=');
    expect(queryRaw.mock.calls[0][0].sql).toContain('e.enrolled_on <');
    expect(queryRaw.mock.calls[0][0].sql).toContain('generate_series(');
    expect(queryRaw.mock.calls[0][0].sql).toContain(
      'COALESCE(monthly_revenue.total_revenue, 0)',
    );
  });

  it('rejects unsupported admin regions', async () => {
    await expect(
      analyticsService.getRevenueByCategory(
        { id: 1, role: 'admin', region: null },
        { region: 'Other' },
      ),
    ).rejects.toThrow('The selected region is not supported');
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it.each([
    { id: 2, role: 'manager', region: null },
    { id: 4, role: 'student', region: 'North' },
    { id: 3, role: 'unknown', region: null },
  ] satisfies AuthUser[])(
    'rejects roles without a valid analytics scope',
    async (user) => {
      await expect(
        analyticsService.getRevenueByCategory(user),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(queryRaw).not.toHaveBeenCalled();
    },
  );
});
