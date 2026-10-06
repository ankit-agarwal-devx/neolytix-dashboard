import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Revenue analytics API (e2e)', () => {
  let app: INestApplication<App>;
  let findUniqueUser: ReturnType<typeof vi.fn>;
  let queryRaw: ReturnType<typeof vi.fn>;
  let jwtService: JwtService;

  beforeEach(async () => {
    findUniqueUser = vi.fn();
    queryRaw = vi.fn().mockResolvedValue([
      { category: 'Programming', totalRevenue: 12000 },
      { category: 'Business', totalRevenue: 5000 },
    ]);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        user: { findUnique: findUniqueUser },
        $queryRaw: queryRaw,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    jwtService = app.get(JwtService);
  });

  afterEach(async () => {
    await app.close();
  });

  async function authCookie(role: string, region: string | null) {
    findUniqueUser.mockResolvedValue({ id: 5, role, region });
    const token = await jwtService.signAsync({ sub: 5 });
    return `access_token=${token}`;
  }

  it.each([
    ['admin', null, null],
    ['manager', 'South', 'South'],
  ])(
    'returns revenue for %s using the shared endpoint and role scope',
    async (role, region, expectedRegion) => {
      const cookie = await authCookie(role, region);
      const response = await request(app.getHttpServer())
        .get('/analytics/revenue-by-category')
        .set('Cookie', cookie)
        .expect(200);

      expect(response.body).toEqual({
        role,
        region: expectedRegion,
        data: [
          { category: 'Programming', totalRevenue: 12000 },
          { category: 'Business', totalRevenue: 5000 },
        ],
      });
      expect(queryRaw).toHaveBeenCalledTimes(1);

      const sql = queryRaw.mock.calls[0][0];
      expect(sql.sql.includes('FILTER (WHERE s.region =')).toBe(
        expectedRegion !== null,
      );
      if (expectedRegion) {
        expect(sql.values).toContain(expectedRegion);
      } else {
        expect(sql.values).toEqual([]);
      }
    },
  );

  it('allows an admin to filter by region', async () => {
    const cookie = await authCookie('admin', null);
    const response = await request(app.getHttpServer())
      .get('/analytics/revenue-by-category?region=North')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toMatchObject({ role: 'admin', region: 'North' });
    expect(queryRaw.mock.calls[0][0].values).toContain('North');
  });

  it('returns monthly revenue from the authenticated user scope', async () => {
    queryRaw.mockResolvedValue([{ month: '2025-01', totalRevenue: 17000 }]);
    const cookie = await authCookie('manager', 'South');
    const response = await request(app.getHttpServer())
      .get('/analytics/revenue-by-month?region=North')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toEqual({
      role: 'manager',
      region: 'South',
      data: [{ month: '2025-01', totalRevenue: 17000 }],
    });
    expect(queryRaw.mock.calls[0][0].values).toContain('South');
    expect(queryRaw.mock.calls[0][0].values).not.toContain('North');
    expect(queryRaw.mock.calls[0][0].sql).toContain('generate_series(');
    expect(queryRaw.mock.calls[0][0].sql).toContain(
      'COALESCE(monthly_revenue.total_revenue, 0)',
    );
  });

  it('filters monthly revenue by year', async () => {
    queryRaw.mockResolvedValue([{ month: '2025-01', totalRevenue: 17000 }]);
    const cookie = await authCookie('admin', null);
    const response = await request(app.getHttpServer())
      .get('/analytics/revenue-by-month?year=2025')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toEqual({
      role: 'admin',
      region: null,
      data: [{ month: '2025-01', totalRevenue: 17000 }],
    });
    expect(queryRaw.mock.calls[0][0].values).toContainEqual(
      new Date(Date.UTC(2025, 0, 1)),
    );
    expect(queryRaw.mock.calls[0][0].values).toContainEqual(
      new Date(Date.UTC(2026, 0, 1)),
    );
    expect(queryRaw.mock.calls[0][0].sql).toContain('generate_series(');
  });

  it('rejects an invalid monthly revenue year', async () => {
    const cookie = await authCookie('admin', null);
    await request(app.getHttpServer())
      .get('/analytics/revenue-by-month?year=20xx')
      .set('Cookie', cookie)
      .expect(400);

    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('always scopes managers to their assigned region despite a requested filter', async () => {
    const cookie = await authCookie('manager', 'South');
    const response = await request(app.getHttpServer())
      .get('/analytics/revenue-by-category?region=North')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toMatchObject({ role: 'manager', region: 'South' });
    expect(queryRaw.mock.calls[0][0].values).toContain('South');
    expect(queryRaw.mock.calls[0][0].values).not.toContain('North');
  });

  it('requires an authenticated cookie', async () => {
    await request(app.getHttpServer())
      .get('/analytics/revenue-by-category')
      .expect(401);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('rejects a manager without an assigned region', async () => {
    const cookie = await authCookie('manager', null);
    await request(app.getHttpServer())
      .get('/analytics/revenue-by-category')
      .set('Cookie', cookie)
      .expect(403);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('rejects accounts with the removed student role', async () => {
    const cookie = await authCookie('student', 'North');
    await request(app.getHttpServer())
      .get('/analytics/revenue-by-category')
      .set('Cookie', cookie)
      .expect(403);
    expect(queryRaw).not.toHaveBeenCalled();
  });
});
