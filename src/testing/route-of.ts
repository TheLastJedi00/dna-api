import { RequestMethod, Type } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';

/**
 * Rota declarada num handler de controller (método HTTP + caminho), lida dos
 * metadados do Nest. Só para testes que fixam o contrato das rotas.
 */
export function routeOf<T>(
  controller: Type<T>,
  method: keyof T & string,
): { method: RequestMethod; path: string } {
  const handler = Object.getOwnPropertyDescriptor(controller.prototype, method)
    ?.value as object;
  return {
    method: Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod,
    path: Reflect.getMetadata(PATH_METADATA, handler) as string,
  };
}
