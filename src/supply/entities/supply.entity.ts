import { HttpException, HttpStatus } from '@nestjs/common';

export const validHumanDesignModules = [
  'tipo-aurico',
  'autoridade',
  'perfil',
  'centros-definidos',
  'centros-indefinidos',
  'centros-abertos',
  'canais',
  'portao-personalidade-sol',
  'portao-personalidade-terra',
  'portao-personalidade-lua',
  'portao-desenho-sol',
  'portao-desenho-terra',
  'portao-desenho-lua',
  'encarnacao',
];

export const validNumerologyModules = [
  'motivacao',
  'impressao',
  'expressao',
  'destino',
  'missao',
  'numero-natalicio',
  'numero-psiquico',
  'talento-oculto',
  'ciclos-de-vida-1-formativo',
  'ciclos-de-vida-2-produtivo',
  'ciclos-de-vida-3-colheita',
  'desafios-de-vida-primeiro',
  'desafios-de-vida-segundo',
  'desafios-de-vida-principal',
  'momentos-desafios-primeiro-decisivo',
  'momentos-desafios-segundo-decisivo',
  'momentos-desafios-terceiro-decisivo',
  'momentos-desafios-quarto-decisivo',
  'ano-pessoal-atual',
  'ano-pessoal-proximo',
  'tendencias-ocultas',
  'resposta-subconsciente',
  'conclusao',
];

export type NumerologyModuleType =
  | 'motivacao'
  | 'impressao'
  | 'expressao'
  | 'destino'
  | 'missao'
  | 'numero-natalicio'
  | 'numero-psiquico'
  | 'talento-oculto'
  | 'ciclos-de-vida-1-formativo'
  | 'ciclos-de-vida-2-produtivo'
  | 'ciclos-de-vida-3-colheita'
  | 'desafios-de-vida-primeiro'
  | 'desafios-de-vida-segundo'
  | 'desafios-de-vida-principal'
  | 'momentos-desafios-primeiro-decisivo'
  | 'momentos-desafios-segundo-decisivo'
  | 'momentos-desafios-terceiro-decisivo'
  | 'momentos-desafios-quarto-decisivo'
  | 'ano-pessoal-atual'
  | 'ano-pessoal-proximo'
  | 'tendencias-ocultas'
  | 'resposta-subconsciente'
  | 'conclusao';

export type HumanDesignModuleType =
  | 'tipo-aurico'
  | 'autoridade'
  | 'perfil'
  | 'centros-definidos'
  | 'centros-indefinidos'
  | 'centros-abertos'
  | 'canais'
  | 'portao-personalidade-sol'
  | 'portao-personalidade-terra'
  | 'portao-personalidade-lua'
  | 'portao-desenho-sol'
  | 'portao-desenho-terra'
  | 'portao-desenho-lua'
  | 'encarnacao';

export class Topic {
  title!: string;
  items!: string[];

  constructor(data: Partial<Topic>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}

export class Supply {
  id!: string;
  pillar!: string;
  module!: HumanDesignModuleType | NumerologyModuleType;
  userId!: string;
  topics!: Topic[];

  constructor(pillar: string, module: string, userId: string, topics: Topic[]) {
    this.pillar = pillar;
    this.module = this.validateModuleByPillar(pillar, module);
    this.userId = userId;
    this.topics = topics;
    this.id = this.generateId();
  }

  validateModuleByPillar(pillar: string, module) {
    if (pillar === 'human-design') {
      return this.validateHumanDesignModule(module);
    }
    // if (pillar === 'numerology') {
      return this.validateNumerologyModule(module);

  }

  validateHumanDesignModule(module: string) {
    if (!validHumanDesignModules.includes(module)) {
      throw new HttpException(
        `"${module}" is not a valid Human Design Module.\nValids Human Design Module: ${validHumanDesignModules.forEach((m) => m)} `,
        HttpStatus.CONFLICT,
      );
    }
    return module as HumanDesignModuleType;
  }

  validateNumerologyModule(module: string) {
    if (!validNumerologyModules.includes(module)) {
      throw new HttpException(
        `"${module}" is not a valid Numerology Module.\nValids Numerology Module: ${validNumerologyModules.forEach((m) => m)} `,
        HttpStatus.CONFLICT,
      );
    }
    return module as NumerologyModuleType;
  }

  generateId() {
    return `${this.userId}-${this.pillar}-${this.module}`;
  }
}
