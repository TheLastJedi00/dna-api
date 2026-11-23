import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';

/**
 * Rota declarada num handler de controller (método HTTP + caminho), lida dos
 * metadados do Nest. Só para testes que fixam o contrato das rotas.
 */
export function routeOf(handler: unknown): {
  method: RequestMethod;
  path: string;
} {
  return {
    method: Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod,
    path: Reflect.getMetadata(PATH_METADATA, handler) as string,
  };
}
