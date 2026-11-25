# DNA API

Backend em [NestJS](https://nestjs.com/) da plataforma DNA (conteúdo esotérico:
human-design, numerologia, astrologia e geração de material por IA). Persistência
em **Firestore** (firebase-admin) e IA via **Google Gemini**. Deploy em container
no **Cloud Run**.

## Arquitetura

- **MVC simples:** `Controller → Service → Repository` (ver `.specs/global-strategy.md`).
- **Repositórios de pilar** herdam de `BaseFirestoreRepository<T>` (CRUD Firestore
  centralizado); os serviços de pilar herdam de `PillarService` (regra comum).
- **Auth:** **Firebase Auth**. O front entra pelo SDK web e manda o **ID token**; o
  `AuthGuard` o valida com o Admin SDK (`verifyIdToken`, checando revogação) e popula
  `request.auth`; `RoleGuard` reaproveita esse payload (roles vêm de uma **custom
  claim**); `OwnershipGuard` garante que um usuário só acesse os próprios dados
  (`:userId`). Todo acesso ao Firebase Auth passa pelo `FirebaseAuthAdapter`.
- **Redis (opcional):** cache de leituras caras (supply/dna-status/prompts) e
  rate-limit distribuído (throttler).
  **Sem `REDIS_URL` a API roda em modo degradado** (funciona, sem esses recursos).

## Setup

```bash
npm install
cp .env.example .env   # preencha os valores
npm run start:dev
```

### Redis local (opcional)

```bash
docker compose up -d redis      # sobe Redis em localhost:6379
# no .env: REDIS_URL=redis://localhost:6379
```

## Variáveis de ambiente

Veja `.env.example`. Destaques:

| Var | Obrigatória | Descrição |
|-----|-------------|-----------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | sim | Service account (JSON em base64). Serve ao Firestore **e** ao Firebase Auth |
| `GEMINI_API_KEY` | sim | Chave da API do Gemini |
| `GEMINI_MODEL` | não | Modelo do Gemini |
| `REDIS_URL` | não | Habilita cache e rate-limit distribuído |
| `ALLOWED_ORIGINS` | não | Origens permitidas no CORS (separar por vírgula) |
| `PORT` | não (8080) | Porta HTTP |

## Autenticação (Firebase Auth)

Desde a spec 010 a API **não tem login, refresh nem logout próprios**: a sessão é do
Firebase. O front faz `signInWithEmailAndPassword` com o SDK web e envia
`Authorization: Bearer <ID token>`.

- **`request.auth`**: `{ id (uid), email, roles (custom claim), emailVerified, authTime }`.
- **E-mail confirmado é obrigatório.** Quem não confirmou recebe **403**
  `{ code: 'EMAIL_NOT_VERIFIED', message: 'Verifique seu e-mail para continuar.' }` em
  qualquer rota, exceto as marcadas com `@AllowUnverified()`: `GET /users/me/:id` e
  `DELETE /users/me`. A regra mora no próprio `AuthGuard` (nenhuma rota autenticada a
  esquece).
- **Roles** são a custom claim `roles`, gravada pela API ao criar a conta (e pela
  migração). `users.roles` é cópia para listagem; toda mudança de role atualiza os dois.

### Cadastro por convite

`POST /users` e `POST /analysts` recebem **só o e-mail** (sem senha). A API cria a conta
no Firebase **sem senha** e com e-mail não verificado, grava a claim `roles` e o perfil
em `users` com `id = uid`. Se a claim ou o perfil falharem, a conta é desfeita. O front
dispara em seguida o e-mail "Defina sua senha" (link de redefinição do Firebase). E-mail
já existente → **409** `Email já cadastrado.`

O detalhe (`GET /users/:id`, `GET /analysts/:id`) traz `accessStatus`:

| Valor | Quando |
|-------|--------|
| `invite_pending` | Nunca entrou (ainda não definiu a senha) |
| `email_unverified` | Já entrou, mas não confirmou o e-mail |
| `active` | E-mail confirmado |
| `null` | O perfil não tem conta no Firebase |

A senha provisória da spec 005 (`tempPassword`, `mustChangePassword`,
`/temp-password`) **não existe mais**: a recuperação de acesso é o "Esqueci minha senha"
do Firebase.

### Meu perfil e exclusão da conta (LGPD)

- `GET /users/me/:id` — perfil. Se o e-mail do token for diferente da cópia em
  `users.email` (a pessoa trocou o e-mail pelo Firebase), a cópia é atualizada.
- `DELETE /users/me` — **exclui a própria conta** (id só do token; **204**). Exige login
  recente: `auth_time` de no máximo **5 minutos** (o front pede a senha antes), senão
  **401** `Confirme sua senha para excluir a conta.` Apaga os documentos dos pilares e de
  `supplies` (inclui o Plano Perfeito), o perfil, o doc legado em `auth`, o cache e, **por
  último**, a conta no Firebase Auth. Idempotente; limite de 5 chamadas por minuto.
  Usuários cadastrados por quem se excluiu continuam, com `createdByName: null`.

Alterar senha e alterar e-mail são feitos pelo SDK web, direto no Firebase (sem API).

### Migração das contas antigas

As credenciais da coleção legada `auth` (bcrypt) são levadas para o Firebase Auth com o
**mesmo id e a mesma senha**, todas com e-mail não verificado:

```bash
npx ts-node scripts/migrate-auth-to-firebase.ts --dry-run --key <service-account.json>
npx ts-node scripts/migrate-auth-to-firebase.ts --key <service-account.json>
```

Sem `--key`, usa `FIREBASE_SERVICE_ACCOUNT_JSON`. Idempotente (pula quem já existe),
relatório só com uids e contagens, e **não apaga** a coleção `auth` (backup até a
release ser validada). Senha provisória vencida é importada sem senha.

## Papéis e visibilidade (RBAC)

| Role | Pode |
|------|------|
| `ADMIN` | Super-usuário: tudo, incluindo **todos** os usuários (mesmo os sem vínculo) |
| `MANAGER` | Gerencia **Analistas** + os usuários **que ele mesmo cadastrou** |
| `ANALYST` | Gerencia apenas os usuários **que ele mesmo cadastrou**. Sem acesso a `/analysts` |
| `USER` | O usuário (cliente): acessa apenas os próprios dados |

Todo usuário guarda `createdBy` = id de quem o cadastrou (vem **do token**, nunca do
corpo). Esse vínculo governa a listagem **e** o acesso direto: `GET`/`PATCH`/`DELETE`
`/users/:id` devolvem **403** se o usuário não for do requisitante (exceto `ADMIN`).

## Usuários (CRUD)

Gestão dos usuários (role `USER`, os clientes). Desativação é **soft delete**
(`isActive`), permitindo reativar.

- `POST /users` — cria um usuário por convite (só `email`, sem senha) e o vincula ao
  requisitante (`ADMIN`/`MANAGER`/`ANALYST`). Além dos dados natais aceita dois campos
  opcionais: `businessArea` (ramo de atuação, texto livre) e `pronoun`
  (`masculino` \| `feminino`, default `feminino`). Devolve `{ id }`.
- `GET /users/active/:orderBy/:direction` — lista **paginada** com busca e filtro,
  já restrita à visibilidade do requisitante.
  Query params:
  | Param | Default | Descrição |
  |-------|---------|-----------|
  | `page` | `1` | Página (>= 1) |
  | `pageSize` | `10` | Itens por página (1..100) |
  | `name` | — | Busca parcial por nome (case-insensitive) |
  | `status` | `active` | `active` \| `inactive` \| `all` |

  O corpo é o **array de itens** da página; os metadados vão nos headers
  `X-Total-Count`, `X-Page`, `X-Page-Size`, `X-Total-Pages` (expostos no CORS).
  Cada item traz `createdBy` e `createdByName` (nome de quem cadastrou; cai para o
  e-mail do Firebase quando o criador não tem perfil, caso do Manager; `null` se o
  criador excluiu a conta).
- `GET /users/:id` — detalhe, com `createdByName`, `email` e `accessStatus`.
- `PATCH /users/:id` — edita o perfil (`fullName`, `birthDate`, `birthTime`,
  `birthPlace`, `businessArea`, `pronoun`).

O `pronoun` e o `businessArea` entram no `toUserDataPrompt()` da entidade `User`,
de onde alcançam **todas** as gerações de conteúdo: o prompt instrui o modelo a
tratar o usuário no gênero escolhido e a considerar o ramo de atuação. Os
templates no Firestore continuam genéricos — não precisam ser alterados.
Cadastros anteriores não têm os campos e assumem `pronoun: 'feminino'`, que é o
comportamento que o sistema já tinha.
- `PATCH /users/:id/reactivate` — reativa (soft delete reverso).
- `DELETE /users/:id` — desativa (soft delete).

## Analistas (CRUD + supervisão)

Analistas são perfis da **mesma coleção `users`**, com `roles: ['ANALYST']` (doc
chaveado pelo uid do Firebase Auth, igual ao usuário) — não têm mapa natal. Todas as
rotas abaixo são exclusivas de **`ADMIN`/`MANAGER`**; o Analista não alcança nenhuma delas.

- `POST /analysts` — cria por convite (`fullName` + `email`, sem senha).
- `GET /analysts` — lista **paginada** (mesmos `page`/`pageSize`/`name`/`status` e
  headers `X-*` da listagem de usuários).
- `GET /analysts/:id` — detalhe, com `email` e `accessStatus`. Devolve **404** se o id
  for de um usuário cliente — a rota não é atalho para dados de cliente.
- `PATCH /analysts/:id` — edita o nome.
- `PATCH /analysts/:id/reactivate` — reativa.
- `DELETE /analysts/:id` — desativa (soft delete).
- `GET /analysts/:id/users` — **supervisão**: a carteira do Analista em DTO
  reduzido — apenas `fullName` e `isActive`. Sem `id` e sem dados natais, de modo que
  o Manager acompanha a carteira sem acessar os dados pessoais da cliente.

## Desenho Humano — campos enumerados

Quatro campos do `POST /human-design/:userId` só aceitam os valores abaixo
(`@IsIn`, em `src/human-design/human-design.constants.ts`). Qualquer outro valor
devolve **400** — o formulário do painel oferece exatamente essas opções.

| Campo | Valores aceitos |
| --- | --- |
| `tipo_aurico` | `Geradora` · `Geradora Manifestante` · `Projetora` · `Manifestadora` · `Refletora` |
| `encarnacao.quarto_de_cruz` | `Quarto 1 - Iniciação` · `Quarto 2 - Civilização` · `Quarto 3 - Dualidade` · `Quarto 4 - Mutação` |
| `encarnacao.angulo` | `Ângulo Direito` · `Ângulo Esquerdo` · `Justa Posição` |
| `encarnacao.grupo_de_destino` | `Pessoal` · `Transpessoal` · `Justa Posição` |

`grupo_de_destino` é derivado do `angulo` no formulário (Direito → Pessoal,
Esquerdo → Transpessoal, Justa Posição → Justa Posição), mas trafega e é validado
como campo próprio, e entra no `toPrompt()`. Documentos gravados antes dele
seguem legíveis: a validação só vale para escrita nova.

## Plano Perfeito

Pilar `perfect-plain` (módulo único `plano-perfeito`) que **reaproveita os dados dos 3
pilares** (Desenho Humano, Numerologia, Astrologia) para gerar um plano único.

- `POST /supply/perfect-plain/:userId` — gera (requer os 3 pilares preenchidos).
- `GET /supply/perfect-plain/:userId` — lê o plano gerado (OwnershipGuard).
- `GET /supply/check/:userId/perfect-plain` — existência.

## Health

- `GET /health` — status da API, conectividade do Redis e métricas de cache.

## Scripts

```bash
npm run start:dev     # dev com watch
npm run build         # build de produção (nest build)
npm run start:prod    # roda dist/main
npm test              # testes (jest)
npx ts-node scripts/migrate-auth-to-firebase.ts --dry-run --key <json>  # migração (spec 010)
```
