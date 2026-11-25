/**
 * Migra as credenciais da coleção legada `auth` (bcrypt) para o Firebase Auth
 * (spec 010), mantendo o mesmo id e a mesma senha.
 *
 * Uso (a partir de api/):
 *   npx ts-node scripts/migrate-auth-to-firebase.ts --dry-run [--key <service-account.json>]
 *   npx ts-node scripts/migrate-auth-to-firebase.ts           [--key <service-account.json>]
 *
 * Sem --key, usa FIREBASE_SERVICE_ACCOUNT_JSON (base64), como a API.
 *
 * - --dry-run: só lê e mostra o relatório; nada é gravado
 * - idempotente: quem já existe no Firebase Auth é pulado
 * - não apaga a coleção `auth` (fica como backup até a release ser validada)
 * - o relatório lista apenas uids e contagens: nunca e-mails, hashes ou senhas
 */
import { readFileSync } from 'fs';
import * as admin from 'firebase-admin';
import {
  LEGACY_HASH,
  LegacyAuthDoc,
  planMigration,
} from '../src/migration/legacy-auth';

const IMPORT_BATCH = 1000; // limite do importUsers
const LOOKUP_BATCH = 100; // limite do getUsers

function parseArgs(argv: string[]) {
  const keyIndex = argv.indexOf('--key');
  return {
    dryRun: argv.includes('--dry-run'),
    keyPath: keyIndex >= 0 ? argv[keyIndex + 1] : undefined,
  };
}

function initFirebase(keyPath?: string): {
  app: admin.app.App;
  projectId: string;
} {
  let serviceAccount: admin.ServiceAccount;
  if (keyPath) {
    serviceAccount = JSON.parse(
      readFileSync(keyPath, 'utf-8'),
    ) as admin.ServiceAccount;
  } else {
    const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!base64) {
      throw new Error(
        'Informe --key <arquivo> ou FIREBASE_SERVICE_ACCOUNT_JSON.',
      );
    }
    serviceAccount = JSON.parse(
      Buffer.from(base64, 'base64').toString('utf-8'),
    ) as admin.ServiceAccount;
  }
  const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  const raw = serviceAccount as { project_id?: string; projectId?: string };
  return {
    app,
    projectId: raw.project_id ?? raw.projectId ?? '(desconhecido)',
  };
}

async function existingUids(
  auth: admin.auth.Auth,
  uids: string[],
): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < uids.length; i += LOOKUP_BATCH) {
    const chunk = uids.slice(i, i + LOOKUP_BATCH).map((uid) => ({ uid }));
    const result = await auth.getUsers(chunk);
    result.users.forEach((user) => found.add(user.uid));
  }
  return found;
}

async function main() {
  const { dryRun, keyPath } = parseArgs(process.argv.slice(2));
  const { app, projectId } = initFirebase(keyPath);
  const auth = admin.auth(app);
  const db = admin.firestore(app);

  const snap = await db.collection('auth').get();
  const docs: LegacyAuthDoc[] = snap.docs.map((doc) => ({
    ...(doc.data() as Omit<LegacyAuthDoc, 'id'>),
    id: doc.id,
  }));
  const plan = planMigration(
    docs,
    await existingUids(
      auth,
      docs.map((d) => d.id),
    ),
  );

  const rolesCount = new Map<string, number>();
  for (const record of plan.toImport) {
    const roles = (record.customClaims?.roles as string[]) ?? [];
    const key = roles.join('+') || '(sem role)';
    rolesCount.set(key, (rolesCount.get(key) ?? 0) + 1);
  }

  console.log(`Projeto: ${projectId}`);
  console.log(`Modo: ${dryRun ? 'DRY-RUN (nada será gravado)' : 'IMPORTAÇÃO'}`);
  console.log(`Docs em \`auth\`: ${docs.length}`);
  console.log(`A importar: ${plan.toImport.length}`);
  for (const [roles, count] of rolesCount) {
    console.log(`  ${roles}: ${count}`);
  }
  console.log(
    `  sem senha (provisória vencida/sem hash): ${plan.withoutPassword.length}`,
  );
  console.log(
    `Já existem no Firebase Auth (pulados): ${plan.alreadyExists.length}`,
  );
  console.log(`Inválidos (sem e-mail): ${plan.invalid.length}`);
  plan.invalid.forEach((uid) => console.log(`  - ${uid}`));

  if (dryRun || plan.toImport.length === 0) {
    return;
  }

  let imported = 0;
  const failures: { uid: string; message: string }[] = [];
  for (let i = 0; i < plan.toImport.length; i += IMPORT_BATCH) {
    const batch = plan.toImport.slice(i, i + IMPORT_BATCH);
    const result = await auth.importUsers(batch, LEGACY_HASH);
    imported += result.successCount;
    result.errors.forEach((e) =>
      failures.push({ uid: batch[e.index].uid, message: e.error.message }),
    );
  }
  console.log(`Importados: ${imported}`);
  console.log(`Falhas: ${failures.length}`);
  failures.forEach((f) => console.log(`  - ${f.uid}: ${f.message}`));
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((e: unknown) => {
  console.error((e as Error).message);
  process.exitCode = 1;
});
