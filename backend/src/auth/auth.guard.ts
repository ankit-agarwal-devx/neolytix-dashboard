import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from './auth-user.js';

interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

interface AccessTokenPayload {
  sub?: number;
}

const ACCESS_TOKEN_COOKIE = 'access_token';

function getAccessToken(cookieHeader: string | undefined): string | undefined {
  const cookie = cookieHeader
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ACCESS_TOKEN_COOKIE}=`));

  if (!cookie) {
    return undefined;
  }

  try {
    return decodeURIComponent(cookie.slice(ACCESS_TOKEN_COOKIE.length + 1));
  } catch {
    return undefined;
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = getAccessToken(request.headers.cookie);
    if (!accessToken) {
      throw new UnauthorizedException('Authentication required');
    }

    let payload: AccessTokenPayload;
    try {
      payload =
        await this.jwtService.verifyAsync<AccessTokenPayload>(accessToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    if (
      typeof payload.sub !== 'number' ||
      !Number.isSafeInteger(payload.sub) ||
      payload.sub < 1
    ) {
      throw new UnauthorizedException('Invalid access token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, region: true },
    });

    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }

    request.user = {
      ...user,
      role: user.role.toLowerCase(),
    };
    return true;
  }
}
