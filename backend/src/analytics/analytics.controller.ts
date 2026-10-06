import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import type { AuthUser } from '../auth/auth-user.js';
import {
  AnalyticsService,
  type RevenueByCategoryResponse,
  type MonthlyRevenueResponse,
} from './analytics.service.js';
import { MonthlyRevenueFilterDto } from './dto/monthly-revenue-filter.dto.js';
import { RevenueFilterDto } from './dto/revenue-filter.dto.js';

interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

@Controller('analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('revenue-by-category')
  getRevenueByCategory(
    @Req() request: AuthenticatedRequest,
    @Query() filter: RevenueFilterDto,
  ): Promise<RevenueByCategoryResponse> {
    return this.analyticsService.getRevenueByCategory(request.user, filter);
  }

  @Get('revenue-by-month')
  getRevenueByMonth(
    @Req() request: AuthenticatedRequest,
    @Query() filter: MonthlyRevenueFilterDto,
  ): Promise<MonthlyRevenueResponse> {
    return this.analyticsService.getRevenueByMonth(request.user, filter);
  }
}
