import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export type UserStatusFilter = 'active' | 'inactive' | 'all';

/**
 * Query da listagem de Maestras. `page`/`pageSize` chegam como string na URL;
 * `@Type(() => Number)` + `transform` do ValidationPipe global convertem para
 * número antes de validar. Defaults aplicados quando o parâmetro é omitido.
 * `name` faz busca parcial (case-insensitive) e `status` filtra por situação.
 */
export class ListUsersQueryDto {
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
