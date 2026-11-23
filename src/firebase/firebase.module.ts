import { Global, Module } from '@nestjs/common';
import * as admin from 'firebase-admin';
import 'dotenv/config';
import { FirebaseAuthAdapter } from './firebase-auth.adapter';

/**
 * App do Firebase inicializado **sob demanda** (na primeira chamada), não no
 * import do módulo. Assim os testes unitários importam serviços e repositórios
 * sem precisar de uma service account válida; a API real falha cedo porque o
 * `main.ts` chama esta função antes de subir.
 */
export function firebaseApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.app();
  }
  const serviceKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceKeyBase64) {
    throw new Error('Chave de Conta de Serviço não encontrada');
  }
  const serviceAccount = JSON.parse(
    Buffer.from(serviceKeyBase64, 'base64').toString('utf-8'),
  ) as admin.ServiceAccount;
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export function getFirestore(): admin.firestore.Firestore {
  return admin.firestore(firebaseApp());
}

export function getFirebaseAuth(): admin.auth.Auth {
  return admin.auth(firebaseApp());
}

@Global()
@Module({
  providers: [FirebaseAuthAdapter],
  exports: [FirebaseAuthAdapter],
})
export class FirebaseModule {}
