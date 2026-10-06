import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RevenueFilterDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  region?: string;
}
