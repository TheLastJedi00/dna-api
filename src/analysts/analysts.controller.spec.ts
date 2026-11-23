import { RequestMethod } from '@nestjs/common';
import { AnalystsController } from './analysts.controller';
import { routeOf } from '../testing/route-of';

describe('AnalystsController — rotas (spec 010: sem "maestras")', () => {
  it('vínculos do Analista é GET /analysts/:id/users', () => {
    expect(routeOf(AnalystsController.prototype.findLinkedMaestras)).toEqual({
      method: RequestMethod.GET,
      path: ':id/users',
    });
  });
});
