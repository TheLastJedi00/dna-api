import * as admin from "firebase-admin";

var serviceAccount = require('../../dna_empresaria_6c142_firebase_adminsdk_fbsvc_1a29b09a39.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const firestore = admin.firestore();