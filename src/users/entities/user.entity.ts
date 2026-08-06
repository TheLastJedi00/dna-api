import { CreateUserDto } from '../dto/create-user.dto';
import { DEFAULT_PRONOUN, Pronoun } from '../pronoun';

/**
 * Documento de perfil da coleção `users`, chaveado pelo id do doc de `auth`.
 * Cobre Maestras (role USER) e Analistas (role ANALYST): o Analista não tem
 * mapa natal, por isso os campos natais são opcionais aqui — a obrigatoriedade
 * de cada fluxo é imposta pelo DTO (CreateUserDto x CreateAnalystDto).
 */
export class User {
  id!: string;
  fullName!: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  isActive!: boolean;
  roles!: string[];
  /** Id de quem cadastrou (Analista ou Manager). Ausente em registros antigos. */
  createdBy?: string;
  /** Cópia do e-mail de acesso; usada para exibir/buscar Analistas. */
  email?: string;
  /** Ramo/segmento em que a empresa da Maestra atua. Texto livre. */
  businessArea?: string;
  /**
   * Pronome de tratamento da Maestra. Ausente nos cadastros anteriores à spec
   * 007 — todo consumo assume `'feminino'` quando não informado.
   */
  pronoun?: Pronoun;

  constructor(
    data: Partial<CreateUserDto> & { createdBy?: string; email?: string },
    id?: string,
    roles?: string[],
  ) {
    this.id = id ? id : data.id!;
    this.fullName = data.fullName!;
    this.birthDate = data.birthDate;
    this.birthTime = data.birthTime;
    this.birthPlace = data.birthPlace;
    this.isActive = true;
    this.roles = roles ?? (data as any).roles ?? [];
    this.createdBy = data.createdBy;
    this.email = data.email;
    this.businessArea = data.businessArea;
    this.pronoun = data.pronoun ?? DEFAULT_PRONOUN;
  }

  disable() {
    this.isActive = false;
  }

  enable() {
    this.isActive = true;
  }

  applyUpdate(
    data: Partial<
      Pick<
        User,
        | 'fullName'
        | 'birthDate'
        | 'birthTime'
        | 'birthPlace'
        | 'businessArea'
        | 'pronoun'
      >
    >,
  ) {
    if (data.fullName !== undefined) this.fullName = data.fullName;
    if (data.birthDate !== undefined) this.birthDate = data.birthDate;
    if (data.birthTime !== undefined) this.birthTime = data.birthTime;
    if (data.birthPlace !== undefined) this.birthPlace = data.birthPlace;
    if (data.businessArea !== undefined) this.businessArea = data.businessArea;
    if (data.pronoun !== undefined) this.pronoun = data.pronoun;
  }

  toUserDataPrompt() {
    const pronoun = this.pronoun ?? DEFAULT_PRONOUN;
    const isMale = pronoun === 'masculino';
    const businessAreaLine = this.businessArea
      ? `\n      Área de atuação: ${this.businessArea}`
      : '';
    return `
    Daddos Maestra:\n
      Nome: ${this.fullName}\n
      Dia nascimento: ${this.birthDate} ${this.birthTime}\n
      Local nascimento: ${this.birthPlace}${businessAreaLine}\n
      Pronome: ${pronoun}. Use linguagem ${isMale ? 'masculina' : 'feminina'}, trate como ${isMale ? 'empresário' : 'empresária'}.
    `;
  }
}
