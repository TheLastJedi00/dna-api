import { toFirestoreData } from './to-firestore';

class Entity {
  id = 'u1';
  fullName = 'Maria';
  // Documentos anteriores às specs 004/007 não têm estes campos.
  createdBy?: string;
  email?: string;
  businessArea?: string;
  constructor(data: Partial<Entity>) {
    this.createdBy = data.createdBy;
    this.email = data.email;
    this.businessArea = data.businessArea;
  }
}

describe('toFirestoreData', () => {
  it('remove campos undefined da entidade (Firestore recusa undefined)', () => {
    const data = toFirestoreData(new Entity({}));
    expect(data).toEqual({ id: 'u1', fullName: 'Maria' });
    expect(Object.keys(data)).not.toContain('createdBy');
  });

  it('mantém null e valores falsy, que são válidos no Firestore', () => {
    const data = toFirestoreData({ a: null, b: 0, c: '', d: false });
    expect(data).toEqual({ a: null, b: 0, c: '', d: false });
  });

  it('limpa também objetos aninhados e itens de array', () => {
    const data = toFirestoreData({
      login: { email: 'x@x.com', password: undefined },
      list: [{ a: 1, b: undefined }],
    });
    expect(data).toEqual({ login: { email: 'x@x.com' }, list: [{ a: 1 }] });
  });

  it('preserva Date sem transformá-lo em objeto', () => {
    const when = new Date('2026-11-16T00:00:00Z');
    const data = toFirestoreData({ when });
    expect(data.when).toBeInstanceOf(Date);
    expect(data.when).toEqual(when);
  });
});
