/**
 * Pronome de tratamento da Maestra (spec 007). Fica fora da entidade e dos DTOs
 * porque os dois lados precisam do tipo — importar de um deles criaria ciclo.
 */
export type Pronoun = 'masculino' | 'feminino';

export const PRONOUNS: Pronoun[] = ['masculino', 'feminino'];

/** Assumido para as Maestras cadastradas antes da spec 007. */
export const DEFAULT_PRONOUN: Pronoun = 'feminino';
