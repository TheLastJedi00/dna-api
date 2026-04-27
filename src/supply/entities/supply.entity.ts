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
];

export type HumanDesignModule =
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
  | 'portao-desenho-lua';

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
  module!: HumanDesignModule;
  userId!: string;
  topics!: Topic[];

  constructor(pillar: string, module: string, userId: string, topics: Topic[]) {
    this.pillar = pillar;
    this.module = this.validateHumanDesignModule(module);
    ((this.userId = userId), (this.topics = topics));
    this.id = this.generateId();
  }

  validateHumanDesignModule(module: string) {
    if (!validHumanDesignModules.includes(module)) {
      throw new Error(
        `"${module}" is not a valid Human Design Module.\nValids Human Design Module: ${validHumanDesignModules.forEach((m) => m)} `,
      );
    }
    return module as HumanDesignModule;
  }

  generateId() {
    return `${this.userId}-${this.pillar}-${this.module}`;
  }
}
