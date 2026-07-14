import { Injectable } from "@nestjs/common";
import * as admin from "firebase-admin"
import { firestore } from "../firebase/firebase.module";
import { instanceToPlain, plainToInstance } from "class-transformer";
import { Auth } from "./entities/auth.entity";

@Injectable()
export class AuthRepository {
  private readonly db: admin.firestore.CollectionReference;

  constructor() {
    this.db = firestore.collection('auth');
  }

  async create(user: Auth) {
      const plain = instanceToPlain(user);
      await this.db.doc(user.id).set(plain);
      return {id: user.id}
  }

  /**
   * Atualiza só os campos informados. `tempPassword: null` é gravado como nulo
   * de propósito — é assim que o rastro da senha provisória é apagado.
   */
  async update(id: string, changes: Partial<Auth>) {
    await this.db.doc(id).update(instanceToPlain(changes));
  }

  async findById(id: string) {
    const snap = await this.db.doc(id).get();
    if (!snap.exists) {
      return null;
    }
    return plainToInstance(Auth, snap.data());
  }

  async findByEmail(email: string) {
    const snap = await this.db.where('email', '==', email).limit(1).get();
    if(snap.empty){
      return null
    }
    const data = snap.docs[0].data()
    const auth = plainToInstance(Auth, data)
    return auth
  }
}