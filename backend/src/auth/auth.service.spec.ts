import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { compare, hash } from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service.js';
import { SignUpDto } from './dto/sign-up.dto.js';
import { AuthService } from './auth.service.js';

vi.mock('bcrypt', () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: {
    user: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
  };
  let jwtService: { signAsync: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prisma = {
      user: {
        create: vi.fn(),
        findUnique: vi.fn(),
      },
    };
    jwtService = { signAsync: vi.fn().mockResolvedValue('signed-token') };
    vi.mocked(hash).mockReset().mockResolvedValue('secure-hash');
    vi.mocked(compare).mockReset().mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  it('validates the password and signs a token without returning the hash', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      email: 'learner@example.com',
      passwordHash: 'stored-hash',
      role: 'manager',
      region: 'North',
    });

    await expect(
      authService.login({
        email: 'learner@example.com',
        password: 'correct horse battery',
      }),
    ).resolves.toEqual({
      accessToken: 'signed-token',
      user: {
        id: 7,
        email: 'learner@example.com',
        role: 'manager',
        region: 'North',
      },
    });

    expect(compare).toHaveBeenCalledWith(
      'correct horse battery',
      'stored-hash',
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 7,
      email: 'learner@example.com',
      role: 'manager',
    });
  });

  it('rejects an unknown email without revealing whether the account exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'unknown@example.com',
        password: 'correct horse battery',
      }),
    ).rejects.toThrow('Invalid email or password');

    expect(compare).not.toHaveBeenCalled();
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('rejects an incorrect password with the same authentication error', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      email: 'learner@example.com',
      passwordHash: 'stored-hash',
      role: 'manager',
      region: null,
    });
    vi.mocked(compare).mockResolvedValue(false);

    await expect(
      authService.login({
        email: 'learner@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toThrow('Invalid email or password');

    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('hashes the password, assigns the manager role, and returns no password hash', async () => {
    const createdUser = {
      id: 1,
      email: 'learner@example.com',
      role: 'manager',
      region: 'South',
    };
    prisma.user.create.mockResolvedValue(createdUser);

    await expect(
      authService.signUp(
        plainToInstance(SignUpDto, {
          email: 'learner@example.com',
          password: 'correct horse battery',
          region: 'South',
        }),
      ),
    ).resolves.toEqual(createdUser);

    expect(hash).toHaveBeenCalledWith('correct horse battery', 12);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'learner@example.com',
        passwordHash: 'secure-hash',
        role: 'manager',
        region: 'South',
      },
      select: {
        id: true,
        email: true,
        role: true,
        region: true,
      },
    });
  });

  it('maps duplicate email errors to a conflict response', async () => {
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.10.0',
        meta: { target: ['email'] },
      }),
    );

    await expect(
      authService.signUp(
        plainToInstance(SignUpDto, {
          email: 'learner@example.com',
          password: 'correct horse battery',
        }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('surfaces unexpected persistence errors', async () => {
    const databaseError = new Error('database unavailable');
    prisma.user.create.mockRejectedValue(databaseError);

    await expect(
      authService.signUp(
        plainToInstance(SignUpDto, {
          email: 'learner@example.com',
          password: 'correct horse battery',
        }),
      ),
    ).rejects.toBe(databaseError);
  });
});
