import type { auth } from 'firebase-admin';

/**
 * Documento da coleção legada `auth` (antes da spec 010): credenciais com
 * hash bcrypt e o estado da senha provisória (spec 005).
 */
export interface LegacyAuthDoc {
  id: string;
  email: string;
  password?: string;
  roles?: string[];
  mustChangePassword?: boolean;
  tempPassword?: string | null;
  tempPasswordExpiresAt?: string | null;
}

/** Algoritmo dos hashes da coleção `auth` (lib `bcrypt` do Node). */
export const LEGACY_HASH: auth.UserImportOptions = {
  hash: { algorithm: 'BCRYPT' },
};

function isTempPasswordExpired(doc: LegacyAuthDoc, now: number): boolean {
  if (!doc.mustChangePassword || !doc.tempPasswordExpiresAt) {
    return false;
  }
  return Date.parse(doc.tempPasswordExpiresAt) <= now;
}

/**
 * Converte um doc legado num registro de importação do Firebase Auth:
 * - `uid` = id do doc, para não mexer em `users`, pilares e `supplies`
 * - e-mail **não verificado** (todos caem no popup de verificação)
 * - roles como custom claim (é de lá que o `AuthGuard` lê)
 * - o hash bcrypt é importado como está: a senha atual continua valendo.
 *   Senha provisória vencida não loga mais, então vai **sem senha** e a pessoa
 *   usa "Esqueci minha senha". O texto plano da provisória nunca é levado.
 */
export function toImportRecord(
  doc: LegacyAuthDoc,
  now = Date.now(),
): auth.UserImportRecord {
  const record: auth.UserImportRecord = {
    uid: doc.id,
    email: doc.email.trim(),
    emailVerified: false,
    customClaims: { roles: doc.roles ?? [] },
  };
  if (doc.password && !isTempPasswordExpired(doc, now)) {
    record.passwordHash = Buffer.from(doc.password);
  }
  return record;
}

export interface MigrationPlan {
  toImport: auth.UserImportRecord[];
  /** uids que já existem no Firebase Auth (rodar de novo não duplica). */
  alreadyExists: string[];
  /** uids sem e-mail: não dá para importar. */
  invalid: string[];
  /** uids importados sem senha (provisória vencida ou sem hash). */
  withoutPassword: string[];
}

export function planMigration(
  docs: LegacyAuthDoc[],
  existingUids: Set<string>,
  now = Date.now(),
): MigrationPlan {
  const plan: MigrationPlan = {
    toImport: [],
    alreadyExists: [],
    invalid: [],
    withoutPassword: [],
  };
  for (const doc of docs) {
    if (existingUids.has(doc.id)) {
      plan.alreadyExists.push(doc.id);
      continue;
    }
    if (!doc.email?.trim()) {
      plan.invalid.push(doc.id);
      continue;
    }
    const record = toImportRecord(doc, now);
    if (!record.passwordHash) {
      plan.withoutPassword.push(doc.id);
    }
    plan.toImport.push(record);
  }
  return plan;
}
