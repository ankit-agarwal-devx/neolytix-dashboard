import { IsOptional, IsString, Matches } from 'class-validator';
import { RevenueFilterDto } from './revenue-filter.dto.js';

export class MonthlyRevenueFilterDto extends RevenueFilterDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, { message: 'year must be a four-digit year' })
  year?: string;
}
