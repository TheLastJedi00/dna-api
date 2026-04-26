import { randomUUID } from 'crypto';

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
  centros_energeticos!: any;
  canais!: any[];
  ativacoes!: any;
  encarnacao!: any;

  constructor(partial?: Partial<HumanDesign>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  toPlainObject() {
    return JSON.parse(JSON.stringify(this));
  }

  toTipoAuricoPrompt(){
    return `
      Tipo Áurico: ${this.tipo_aurico}\n
      Aura: ${this.aura}\n
      Energia: ${this.energia}\n
      Palavra: ${this.palavra_chave}\n
      Tema do Não Ser: ${this.tema_do_nao_ser}
    `
  }
}
