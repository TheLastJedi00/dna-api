import { Injectable } from '@nestjs/common';
import type { firestore } from 'firebase-admin';
import { getFirestore } from '../firebase/firebase.module';

/** Coleções com documentos do usuário marcados pelo campo `userId`. */
const USER_DATA_COLLECTIONS = [
  'human-design',
  'numerology',
  'astrology',
  // inclui o Plano Perfeito
  'supplies',
] as const;

/** Coleções cujo documento é o próprio id do usuário. */
const USER_DOC_COLLECTIONS = [
  'users',
  // legado (pré-spec 010); some de vez após a migração validada
  'auth',
] as const;

/** Limite de operações por batch do Firestore. */
const BATCH_LIMIT = 500;

/**
 * Acesso de escrita usado só pela exclusão de conta (LGPD): enxerga todas as
 * coleções que guardam dados de uma pessoa. Fica separado dos repositórios de
 * cada pilar para que a lista do que é apagado esteja num lugar só.
 */
@Injectable()
export class AccountDataRepository {
  private get db(): firestore.Firestore {
    return getFirestore();
  }

  /** Pilar/módulo dos supplies do usuário (para limpar as chaves de cache). */
  async findSupplyModules(
    userId: string,
  ): Promise<{ pillar: string; module: string }[]> {
    const snap = await this.db
      .collection('supplies')
      .where('userId', '==', userId)
      .get();
    return snap.docs.map((doc) => {
      const data = doc.data() as { pillar?: string; module?: string };
      return { pillar: String(data.pillar), module: String(data.module) };
    });
  }

  /** Apaga todos os documentos do usuário. Documento ausente não é erro. */
  async deleteUserData(userId: string): Promise<void> {
    const refs: firestore.DocumentReference[] = [];
    for (const collection of USER_DATA_COLLECTIONS) {
      const snap = await this.db
        .collection(collection)
        .where('userId', '==', userId)
        .get();
      refs.push(...snap.docs.map((doc) => doc.ref));
    }
    for (const collection of USER_DOC_COLLECTIONS) {
      refs.push(this.db.collection(collection).doc(userId));
    }
    for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
      const batch = this.db.batch();
      refs.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
  }
}
