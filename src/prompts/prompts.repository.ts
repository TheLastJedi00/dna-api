import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { firestore } from '../firebase/firebase.module';
import { plainToInstance } from 'class-transformer';
import { Prompt } from './entities/prompt.entity';

@Injectable()
export class PromptsRepository {
  private readonly db: admin.firestore.CollectionReference;
  constructor() {
    this.db = firestore.collection('prompts');
  }
  async findPromptByCategory(category: string) {
    const snap = await this.db.where('category', '==', category).limit(1).get();
    if (!snap) {
      return null;
    }
    const doc = snap.docs[0].data();
    return doc;
  }
}
