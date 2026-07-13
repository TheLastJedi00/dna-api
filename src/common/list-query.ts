import { BadRequestException } from '@nestjs/common';
import { UserStatusFilter } from '../users/dto/list-users-query.dto';

/** Mínimo que um item precisa expor para ser listado (Maestra e Analista). */
export interface Listable {
  fullName: string;
  isActive: boolean;
}

export interface ListQuery {
  orderBy: string;
  direction: string;
  page?: number;
  pageSize?: number;
  name?: string;
  status?: UserStatusFilter;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Busca por nome (parcial, case-insensitive), filtro de status, ordenação e
 * paginação — tudo em memória. Maestras e Analistas moram na mesma coleção e
 * têm volume pequeno; manter a filtragem aqui evita exigir índice composto no
 * Firestore. Compartilhado pelos dois serviços para não duplicar a regra.
 */
export function applyListQuery<T extends Listable>(
  all: T[],
  query: ListQuery,
): Paged<T> {
  const { orderBy, direction } = query;
  assertDirection(direction);
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const status = query.status ?? 'active';
  const nameQuery = query.name?.trim().toLowerCase();

  const filtered = all
    .filter((item) => matchesStatus(item, status))
    .filter(
      (item) => !nameQuery || item.fullName?.toLowerCase().includes(nameQuery),
    );
  const sorted = sortByField(filtered, orderBy, direction);

  const start = (page - 1) * pageSize;
  return {
    items: sorted.slice(start, start + pageSize),
    total: sorted.length,
    page,
    pageSize,
  };
}

/**
 * Valida a direção antes de qualquer ida ao Firestore — não faz sentido
 * consultar a coleção para depois recusar o parâmetro.
 */
export function assertDirection(direction: string): void {
  if (direction !== 'asc' && direction !== 'desc') {
    throw new BadRequestException('Direção inválida: use "asc" ou "desc".');
  }
}

function matchesStatus(item: Listable, status: UserStatusFilter): boolean {
  if (status === 'all') return true;
  if (status === 'inactive') return !item.isActive;
  return item.isActive;
}

function sortByField<T>(items: T[], orderBy: string, direction: string): T[] {
  const dir = direction === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const av = (a as Record<string, unknown>)[orderBy];
    const bv = (b as Record<string, unknown>)[orderBy];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return String(av).localeCompare(String(bv)) * dir;
  });
}
