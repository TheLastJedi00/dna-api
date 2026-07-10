import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Query da listagem de Maestras. `page`/`pageSize` chegam como string na URL;
 * `@Type(() => Number)` + `transform` do ValidationPipe global convertem para
 * número antes de validar. Defaults aplicados quando o parâmetro é omitido.
 * (busca por nome e filtro de status entram na fase 3, neste mesmo DTO.)
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
}
