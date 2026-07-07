import { Injectable } from '@nestjs/common';
import { Numerology } from './entities/numerology.entity';
import { BaseFirestoreRepository } from '../firebase/base-firestore.repository';

@Injectable()
export class NumerologyRepository extends BaseFirestoreRepository<Numerology> {
  constructor() {
    super('numerology', Numerology);
  }
}
