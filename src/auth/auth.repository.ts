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

  async findById(id:string){
    const snap = await this.db.doc(id).get()
    if(!snap){
      return null
    }
    const data = snap.data()
    return plainToInstance(Auth, data)
  }
}