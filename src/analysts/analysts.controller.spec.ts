import { RequestMethod } from '@nestjs/common';
import { AnalystsController } from './analysts.controller';
import { routeOf } from '../testing/route-of';

describe('AnalystsController — rotas (spec 010: termo "usuários")', () => {
  it('vínculos do Analista é GET /analysts/:id/users', () => {
    expect(routeOf(AnalystsController, 'findLinkedUsers')).toEqual({
      method: RequestMethod.GET,
      path: ':id/users',
    });
  });
});
