import { randomUUID } from 'crypto';

export class PontoAstrologico {
  signo!: string;
  casaAstrologica!: number;
  planetas!: string | null;
}

export class Elementos {
  fogo!: number;
  terra!: number;
  ar!: number;
  agua!: number;
}

export class TriadeAstrologica {
  sol!: PontoAstrologico;
  ascendente!: PontoAstrologico;
  lua!: PontoAstrologico;
}

export class Astrology {
  userId!: string;
  id: string = randomUUID();
  triadeAstrologica!: TriadeAstrologica;
  meioDoCeu!: PontoAstrologico;
  dinheiro!: PontoAstrologico;
  comunicacao!: PontoAstrologico;
  elementos!: Elementos;

  constructor(partial?: Partial<Astrology>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  toPlainObject() {
    return JSON.parse(JSON.stringify(this));
  }

  toPrompt(): string {
    const formatPonto = (nome: string, p: PontoAstrologico | undefined): string => {
      if (!p) return `  ${nome}: Não informado`;
      return `  ${nome}: Signo ${p.signo || ''}, Casa ${p.casaAstrologica ?? ''}, Planetas ${p.planetas || 'Nenhum'}`;
    };

    const t = this.triadeAstrologica;
    const e = this.elementos;

    return `
  Dados de Astrologia
  UserId: ${this.userId || ''}
  --- Tríade Astrológica ---
${formatPonto('Sol', t?.sol)}
${formatPonto('Ascendente', t?.ascendente)}
${formatPonto('Lua', t?.lua)}
  --- Outros Pontos ---
${formatPonto('Meio do Céu', this.meioDoCeu)}
${formatPonto('Dinheiro', this.dinheiro)}
${formatPonto('Comunicação', this.comunicacao)}
  --- Elementos ---
  Fogo: ${e?.fogo ?? ''}
  Terra: ${e?.terra ?? ''}
  Ar: ${e?.ar ?? ''}
  Água: ${e?.agua ?? ''}`;
  }
}
