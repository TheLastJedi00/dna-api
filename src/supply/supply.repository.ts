import { Injectable } from "@nestjs/common";
import { Supply } from "./entities/supply.entity";
import * as admin from 'firebase-admin'
import { firestore } from "../firebase/firebase.module";
import { instanceToPlain } from "class-transformer";

@Injectable()
export class SupplyRepository {
    private readonly db: admin.firestore.CollectionReference;
    constructor(){
        this.db = firestore.collection('supplies')
    }

    async create(supply: Supply){
        const plain = instanceToPlain(supply)
        await this.db.doc(supply.id).set(plain);
        return supply;
    }
}