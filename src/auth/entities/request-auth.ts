/**
 * O que o `AuthGuard` deixa em `request.auth` depois de validar o ID token do
 * Firebase. `id`, `email` e `roles` mantêm o formato que `RoleGuard`,
 * `OwnershipGuard` e `@Ownership` já liam antes da spec 010.
 */
export interface RequestAuth {
  /** uid do Firebase = id do usuário em `users`, pilares e `supplies`. */
  id: string;
  email: string;
  /** Custom claim `roles`, gravada pela API na criação/migração da conta. */
  roles: string[];
  emailVerified: boolean;
  /** Quando a pessoa digitou a senha pela última vez (segundos desde a época). */
  authTime: number;
}
