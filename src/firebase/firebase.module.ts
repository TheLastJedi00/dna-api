import * as admin from "firebase-admin";

var serviceAccount = require('../../dna-empresaria-6c142-firebase-adminsdk-fbsvc-1a29b09a39.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const db = admin.firestore();