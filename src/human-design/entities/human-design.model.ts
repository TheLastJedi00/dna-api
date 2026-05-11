import { randomUUID } from 'crypto';

export class Canal {
  id!: string;
  nome!: string;
}

export class CentrosEnergeticos {
  definidos!: string[];
  indefinidos!: string[];
  abertos!: string[];
}

export class PontosAtivacao {
  sol!: number;
  terra!: number;
  lua!: number;
}

export class Ativacoes {
  personalidade!: PontosAtivacao;
  desenho!: PontosAtivacao;
}

export class Encarnacao {
  angulo!: string;
  cruz!: string;
  portoes!: string;
  quarto_de_cruz!: string;
}

export class HumanDesign {
  userId!: string;
  id: string = randomUUID();
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
  encarnacao!: Encarnacao;

  constructor(partial?: Partial<HumanDesign>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  toPlainObject() {
    return JSON.parse(JSON.stringify(this));
  }

  toPrompt(): string {
    return `
  Dados do Desenho Humano\n
  UserId: ${this.userId || ''}
  Id: ${this.id || ''}
  Tipo Áurico: ${this.tipo_aurico || ''}
  Aura: ${this.aura || ''}
  Energia: ${this.energia || ''}
  Palavra Chave: ${this.palavra_chave || ''}
  Estratégia: ${this.estrategia || ''}
  Assinatura: ${this.assinatura || ''}
  Tema do Não Ser: ${this.tema_do_nao_ser || ''}
  Autoridade: ${this.autoridade || ''}
  Perfil: ${this.perfil || ''}
  Centros Energéticos (Definidos): ${this.centros_energeticos?.definidos?.join(', ') || 'Nenhum'}
  Centros Energéticos (Indefinidos): ${this.centros_energeticos?.indefinidos?.join(', ') || 'Nenhum'}
  Centros Energéticos (Abertos): ${this.centros_energeticos?.abertos?.join(', ') || 'Nenhum'}
  Canais: ${this.canais?.map((canal) => canal.nome).join(', ') || 'Nenhum'}
  Ativações Personalidade (Sol/Terra/Lua): ${this.ativacoes?.personalidade?.sol || ''} / ${this.ativacoes?.personalidade?.terra || ''} / ${this.ativacoes?.personalidade?.lua || ''}
  Ativações Desenho (Sol/Terra/Lua): ${this.ativacoes?.desenho?.sol || ''} / ${this.ativacoes?.desenho?.terra || ''} / ${this.ativacoes?.desenho?.lua || ''}
  Encarnação (Ângulo): ${this.encarnacao?.angulo || ''}
  Encarnação (Cruz): ${this.encarnacao?.cruz || ''}
  Encarnação (Portões): ${this.encarnacao?.portoes || ''}
  Encarnação (Quarto de Cruz): ${this.encarnacao?.quarto_de_cruz || ''}`;
  }
}
