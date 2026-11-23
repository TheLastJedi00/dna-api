import { RequestMethod } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersController } from './users.controller';
import { ALLOW_UNVERIFIED_KEY } from '../decorators/allow-unverified.decorator';
import { routeOf } from '../testing/route-of';

/**
 * Quais rotas de `users` ficam abertas para quem ainda não confirmou o e-mail.
 * Só as de perfil: o resto (gestão) exige e-mail confirmado.
 */
describe('UsersController — rotas liberadas sem e-mail confirmado', () => {
  const reflector = new Reflector();
  const allows = (handler: keyof UsersController) =>
    reflector.get<boolean>(
      ALLOW_UNVERIFIED_KEY,
      Object.getOwnPropertyDescriptor(UsersController.prototype, handler)
        ?.value as () => unknown,
    ) === true;

  it('GET /users/me/:id (perfil) é liberada', () => {
    expect(allows('findMe')).toBe(true);
  });

  it('rotas de gestão continuam exigindo e-mail confirmado', () => {
    expect(allows('findOne')).toBe(false);
    expect(allows('updateUser')).toBe(false);
    expect(allows('disableUser')).toBe(false);
  });
});

describe('UsersController — rotas (spec 010: sem "maestra" na rota)', () => {
  it('cadastro é POST /users', () => {
    expect(routeOf(UsersController, 'createUser')).toEqual({
      method: RequestMethod.POST,
      path: '/',
    });
  });
});
