import { Injectable } from '@nestjs/common';
import { Astrology } from './entities/astrology.entity';
import { BaseFirestoreRepository } from '../firebase/base-firestore.repository';

@Injectable()
export class AstrologyRepository extends BaseFirestoreRepository<Astrology> {
  constructor() {
    super('astrology', Astrology);
  }
}
