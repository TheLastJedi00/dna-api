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
  async findPromptByPillar(pillar: string) {
    const snap = await this.db.where('pillar', '==', pillar).get();
    if (!snap) {
      return null;
    }
    const docs = snap.docs;
    const prompts = docs.map(d => plainToInstance(Prompt, d.data()))
    return prompts;
  }

  async findByPillarAndModule(pillar: string, module: string) {
    const snap = await this.db.where("pillar","==",pillar).where("module","==",module).limit(1).get();
    if(!snap){
      return null
    }
    const doc = snap.docs[0].data();
    const prompt = plainToInstance(Prompt, doc)
    return prompt;
  }

  async createPrompt(prompt: Prompt){
    return this.db.doc().set(prompt)
  }

  async createManyPrompts(prompts: Prompt[]) {
    const batch = firestore.batch();
    for (const prompt of prompts) {
      const ref = this.db.doc();
      batch.set(ref, { ...prompt });
    }
    return batch.commit();
  }
}
