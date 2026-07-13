import { CreateUserDto } from '../dto/create-user.dto';

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
  }

  disable() {
    this.isActive = false;
  }

  enable() {
    this.isActive = true;
  }

  applyUpdate(data: Partial<Pick<User, 'fullName' | 'birthDate' | 'birthTime' | 'birthPlace'>>) {
    if (data.fullName !== undefined) this.fullName = data.fullName;
    if (data.birthDate !== undefined) this.birthDate = data.birthDate;
    if (data.birthTime !== undefined) this.birthTime = data.birthTime;
    if (data.birthPlace !== undefined) this.birthPlace = data.birthPlace;
  }

  toUserDataPrompt() {
    return `
    Daddos Maestra:\n
      Nome: ${this.fullName}\n
      Dia nascimento: ${this.birthDate} ${this.birthTime}\n
      Local nascimento: ${this.birthPlace}
    `;
  }
}
