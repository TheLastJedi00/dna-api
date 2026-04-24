import { v4 as uuidv4 } from 'uuid';
import { CreateHumanDesignDto } from '../dto/create-human-design.dto';

export class HumanDesign {
  id = this.generateId();
  tipo_aurico!: string;
  aura!: string;
  energia!: string;
  palavra_chave!: string;
  estrategia!: string;
  assinatura!: string;
  tema_do_nao_ser!: string;
  autoridade!: string;
  perfil!: string;
  centros_energeticos!: CentrosEnergeticos;
  canais!: Canal[];
  ativacoes!: Ativacoes;
  encarnacao!: CruzEncarnacao;

  constructor(dh?: Partial<CreateHumanDesignDto>) {
    if (dh) {
      Object.assign(this, dh);
    }
  }

  generateId() {
    return uuidv4();
  }

  toPlainObject() {
    return {
      ...this,
    };
  }
}

export interface Canal {
  id: string;
  nome: string;
}

export interface CentrosEnergeticos {
  definidos: string[];
  indefinidos: string[];
  abertos: string[];
}

export interface PontosAtivacao {
  sol: number;
  terra: number;
  lua: number;
  [key: string]: number;
}

export interface Ativacoes {
  personalidade: PontosAtivacao;
  desenho: PontosAtivacao;
}

export interface CruzEncarnacao {
  angulo: string;
  cruz: string;
  portoes: string;
  quarto_de_cruz: string;
}
