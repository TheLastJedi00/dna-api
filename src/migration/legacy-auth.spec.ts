import { planMigration, toImportRecord, LegacyAuthDoc } from './legacy-auth';

/**
 * Conversão de um doc da coleção legada `auth` (bcrypt) para um registro de
 * importação do Firebase Auth, preservando o id e a senha (spec 010).
 */
describe('legacy-auth → Firebase Auth', () => {
  const NOW = Date.parse('2026-11-23T12:00:00Z');
  const doc = (partial: Partial<LegacyAuthDoc> = {}): LegacyAuthDoc => ({
    id: 'uid-1',
    email: 'ana@dna.com',
    password: '$2b$10$abcdefghijklmnopqrstuuvwxyzABCDEFGHIJKLMNOPQRSTUV',
    roles: ['USER'],
    mustChangePassword: false,
    tempPassword: null,
    tempPasswordExpiresAt: null,
    ...partial,
  });

  describe('toImportRecord', () => {
    it('mantém o id, o e-mail e o hash bcrypt; e-mail não verificado; roles na claim', () => {
      const record = toImportRecord(doc(), NOW);
      expect(record).toEqual({
        uid: 'uid-1',
        email: 'ana@dna.com',
        emailVerified: false,
        customClaims: { roles: ['USER'] },
        passwordHash: Buffer.from(doc().password!),
      });
    });

    it('senha provisória ainda válida: o hash vale como senha normal', () => {
      const record = toImportRecord(
        doc({
          mustChangePassword: true,
          tempPassword: 'provisoria',
          tempPasswordExpiresAt: '2026-11-24T00:00:00Z',
        }),
        NOW,
      );
      expect(record.passwordHash).toBeDefined();
    });

    it('senha provisória vencida: importa sem senha (a pessoa usa "Esqueci minha senha")', () => {
      const record = toImportRecord(
        doc({
          mustChangePassword: true,
          tempPassword: null,
          tempPasswordExpiresAt: '2026-11-01T00:00:00Z',
        }),
        NOW,
      );
      expect(record).not.toHaveProperty('passwordHash');
    });

    it('nunca leva o texto plano da senha provisória', () => {
      const record = toImportRecord(
        doc({ mustChangePassword: true, tempPassword: 'provisoria' }),
        NOW,
      );
      expect(JSON.stringify(record)).not.toContain('provisoria');
    });

    it('sem roles gravadas: claim com lista vazia', () => {
      expect(
        toImportRecord(doc({ roles: undefined }), NOW).customClaims,
      ).toEqual({ roles: [] });
    });
  });

  describe('planMigration', () => {
    it('pula quem já existe no Firebase (idempotente) e quem não tem e-mail', () => {
      const plan = planMigration(
        [
          doc({ id: 'novo' }),
          doc({ id: 'ja-existe' }),
          doc({ id: 'sem-email', email: '' }),
          doc({
            id: 'vencida',
            mustChangePassword: true,
            tempPasswordExpiresAt: '2026-11-01T00:00:00Z',
          }),
        ],
        new Set(['ja-existe']),
        NOW,
      );

      expect(plan.toImport.map((r) => r.uid)).toEqual(['novo', 'vencida']);
      expect(plan.alreadyExists).toEqual(['ja-existe']);
      expect(plan.invalid).toEqual(['sem-email']);
      expect(plan.withoutPassword).toEqual(['vencida']);
    });
  });
});
