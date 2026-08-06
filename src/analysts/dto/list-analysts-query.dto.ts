import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { UserStatusFilter } from '../../users/dto/list-users-query.dto';

/**
 * Query da listagem de Analistas — mesma forma da listagem de Maestras
 * (`page`/`pageSize`/`name`/`status`), para o front reaproveitar os controles.
 */
export class ListAnalystsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['active', 'inactive', 'all'])
  status?: UserStatusFilter = 'active';
}
