import { randomUUID } from 'crypto';

export class PerfilNumerologico {
  motivacao!: number;
  impressao!: number;
  expressao!: number;
  destino!: number;
  missao!: number;
  data_natalicia!: number;
  numero_psiquico!: number;
  talento_oculto!: number;
}

export class PeriodoNumerologico {
  inicio!: number;
  fim!: number | string;
  numero!: number;
}

export class AnoPessoal {
  numero!: number;
  validade!: string;
}

export class AnoPessoalData {
  atual!: AnoPessoal;
  proximo!: AnoPessoal;
}

export class ExtrasNumerologicos {
  tendencias_ocultas!: number[];
  respostas_subconscientes!: number;
  numeros_favoraveis!: number[];
}

export class Numerology {
  userId!: string;
  id: string = randomUUID();
  perfil!: PerfilNumerologico;
  ciclos_de_vida!: PeriodoNumerologico[];
  desafios!: PeriodoNumerologico[];
  momentos_decisivos!: PeriodoNumerologico[];
  ano_pessoal!: AnoPessoalData;
  extras!: ExtrasNumerologicos;

  constructor(partial?: Partial<Numerology>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  toPlainObject() {
    return JSON.parse(JSON.stringify(this));
  }

  toPrompt(): string {
    const p = this.perfil;
    return `
  Dados de Numerologia
  UserId: ${this.userId || ''}
  Motivação: ${p?.motivacao ?? ''}
  Impressão: ${p?.impressao ?? ''}
  Expressão: ${p?.expressao ?? ''}
  Destino: ${p?.destino ?? ''}
  Missão: ${p?.missao ?? ''}
  Data Natalícia: ${p?.data_natalicia ?? ''}
  Número Psíquico: ${p?.numero_psiquico ?? ''}
  Talento Oculto: ${p?.talento_oculto ?? ''}
  Ciclos de Vida: ${this.ciclos_de_vida?.map((c) => `${c.inicio}-${c.fim}(${c.numero})`).join(', ') || 'Nenhum'}
  Desafios: ${this.desafios?.map((d) => `${d.inicio}-${d.fim}(${d.numero})`).join(', ') || 'Nenhum'}
  Momentos Decisivos: ${this.momentos_decisivos?.map((m) => `${m.inicio}-${m.fim}(${m.numero})`).join(', ') || 'Nenhum'}
  Ano Pessoal Atual: ${this.ano_pessoal?.atual?.numero ?? ''} (${this.ano_pessoal?.atual?.validade ?? ''})
  Ano Pessoal Próximo: ${this.ano_pessoal?.proximo?.numero ?? ''} (${this.ano_pessoal?.proximo?.validade ?? ''})
  Tendências Ocultas: ${this.extras?.tendencias_ocultas?.join(', ') || 'Nenhuma'}
  Respostas Subconscientes: ${this.extras?.respostas_subconscientes ?? ''}
  Números Favoráveis: ${this.extras?.numeros_favoraveis?.join(', ') || 'Nenhum'}`;
  }
}
