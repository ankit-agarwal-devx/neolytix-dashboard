import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { compare, hash } from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

vi.mock('bcrypt', () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

describe('Auth API (e2e)', () => {
  let app: INestApplication<App>;
  let createUser: ReturnType<typeof vi.fn>;
  let findUniqueUser: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.mocked(hash).mockReset().mockResolvedValue('stored-hash');
    vi.mocked(compare).mockReset().mockResolvedValue(true);
    createUser = vi.fn().mockResolvedValue({
      id: 1,
      email: 'learner@example.com',
      role: 'manager',
      region: 'South',
    });
    findUniqueUser = vi.fn().mockResolvedValue({
      id: 1,
      email: 'learner@example.com',
      passwordHash: 'stored-hash',
      role: 'manager',
      region: 'South',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ user: { create: createUser, findUnique: findUniqueUser } })
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
  });

  afterEach(async () => {
    await app.close();
  });

  it('sets the access token in an HttpOnly cookie and returns public user data', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: ' Learner@Example.com ',
        password: 'correct horse battery',
      })
      .expect(200)
      .expect({
        id: 1,
        email: 'learner@example.com',
        role: 'manager',
        region: 'South',
      });

    const cookie = response.headers['set-cookie']?.[0];
    expect(cookie).toContain('access_token=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(JSON.stringify(response.body)).not.toContain('accessToken');
    expect(findUniqueUser).toHaveBeenCalledWith({
      where: { email: 'learner@example.com' },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        region: true,
      },
    });
  });

  it('rejects invalid credentials without issuing a cookie', async () => {
    vi.mocked(compare).mockResolvedValue(false);

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'learner@example.com',
        password: 'wrong-password',
      })
      .expect(401);

    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('creates a manager account and returns only public account fields', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: ' Learner@Example.com ',
        password: 'correct horse battery',
        region: 'South',
      })
      .expect(201)
      .expect({
        id: 1,
        email: 'learner@example.com',
        role: 'manager',
        region: 'South',
      });

    expect(createUser).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'learner@example.com',
        role: 'manager',
        region: 'South',
      }),
      select: {
        id: true,
        email: true,
        role: true,
        region: true,
      },
    });
    expect(createUser.mock.calls[0][0].data.passwordHash).not.toBe(
      'correct horse battery',
    );
  });

  it('rejects attempts to choose a privileged role', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'learner@example.com',
        password: 'correct horse battery',
        role: 'admin',
      })
      .expect(400);

    expect(createUser).not.toHaveBeenCalled();
  });
});
