import { Injectable } from '@nestjs/common';
import { HumanDesign } from './entities/human-design.model';
import { BaseFirestoreRepository } from '../firebase/base-firestore.repository';

@Injectable()
export class HumanDesignRepository extends BaseFirestoreRepository<HumanDesign> {
  constructor() {
    super('human-design', HumanDesign);
  }
}
