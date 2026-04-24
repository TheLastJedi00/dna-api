import * as admin from 'firebase-admin';

require("dotenv").config();
const serviceKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!serviceKeyBase64) {
  throw new Error('Chave de Conta de Serviço não encontrada');
}
const buffer = Buffer.from(serviceKeyBase64, 'base64')
const serviceKeyString = buffer.toString('utf-8')
const serviceAccount = JSON.parse(serviceKeyString);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const firestore = admin.firestore();
