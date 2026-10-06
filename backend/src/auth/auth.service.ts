import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { compare, hash } from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import { SignUpDto } from './dto/sign-up.dto.js';
import { SignUpResponseDto } from './dto/sign-up-response.dto.js';

const PASSWORD_HASH_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        region: true,
      },
    });

    if (!user || !(await compare(loginDto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        region: user.region,
      },
    };
  }

  async signUp(signUpDto: SignUpDto): Promise<SignUpResponseDto> {
    const passwordHash = await hash(signUpDto.password, PASSWORD_HASH_ROUNDS);

    try {
      return await this.prisma.user.create({
        data: {
          email: signUpDto.email,
          passwordHash,
          role: 'manager',
          region: signUpDto.region,
        },
        select: {
          id: true,
          email: true,
          role: true,
          region: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }

      throw error;
    }
  }
}
