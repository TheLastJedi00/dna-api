# DNA API

Backend em [NestJS](https://nestjs.com/) da plataforma DNA (conteúdo esotérico:
human-design, numerologia, astrologia e geração de material por IA). Persistência
em **Firestore** (firebase-admin) e IA via **Google Gemini**. Deploy em container
no **Cloud Run**.

## Arquitetura

- **MVC simples:** `Controller → Service → Repository` (ver `.specs/global-strategy.md`).
- **Repositórios de pilar** herdam de `BaseFirestoreRepository<T>` (CRUD Firestore
  centralizado); os serviços de pilar herdam de `PillarService` (regra comum).
- **Auth:** JWT com par **access token curto** + **refresh token** (segredo próprio).
  `AuthGuard` valida e popula `request.auth`; `RoleGuard` reaproveita esse payload;
  `OwnershipGuard` garante que um usuário só acesse os próprios dados (`:userId`).
- **Redis (opcional):** cache de leituras caras (supply/dna-status/prompts),
  rate-limit distribuído (throttler) e allowlist/rotação de refresh tokens.
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
| `FIREBASE_SERVICE_ACCOUNT_JSON` | sim | Service account (JSON em base64) |
| `JWT_SECRET` | sim | Segredo do access token |
| `JWT_REFRESH_SECRET` | sim | Segredo do refresh token |
| `JWT_ACCESS_EXPIRES` | não (15m) | Expiração do access token |
| `JWT_REFRESH_EXPIRES` | não (7d) | Expiração do refresh token |
| `GEMINI_API_KEY` | sim | Chave da API do Gemini |
| `GEMINI_MODEL` | não | Modelo do Gemini |
| `REDIS_URL` | não | Habilita cache/rate-limit/allowlist de refresh |
| `ALLOWED_ORIGINS` | não | Origens permitidas no CORS (separar por vírgula) |
| `PORT` | não (8080) | Porta HTTP |

## Autenticação

- `POST /auth` — login por credenciais → `{ access_token, refresh_token, mustChangePassword }`.
- `POST /auth/refresh` — renova o par a partir do refresh (rotação; nega se revogado).
- `POST /auth/logout` — revoga o refresh informado.
- `POST /auth/change-password` — o próprio usuário define a senha definitiva. O id sai
  **do token**, nunca do corpo. Devolve um **par de tokens novo**.

## Senha temporária (primeiro acesso e recuperação)

A senha definida no cadastro (`POST /users/maestra`, `POST /analysts`) **já nasce
provisória**: vale para o login, mas o usuário é obrigado a trocá-la no primeiro acesso.
Até lá ela fica visível, em texto plano, para quem o cadastrou.

O estado mora no doc `auth`:

| Campo | Descrição |
|-------|-----------|
| `mustChangePassword` | `true` enquanto a senha em uso for provisória |
| `tempPassword` | a senha provisória **em texto plano**; `null` após a troca |

- `PATCH /users/:id/temp-password` (`ADMIN`/`MANAGER`/`ANALYST`, **com posse**) e
  `PATCH /analysts/:id/temp-password` (`ADMIN`/`MANAGER`) — o gestor digita uma senha
  provisória para devolver o acesso a quem o perdeu.
- `POST /auth/change-password` — o usuário define a definitiva: apaga o `tempPassword`,
  zera a flag e recebe tokens novos.

**`mustChangePassword` é claim do JWT**, não só um campo da resposta do login: é isso que
faz o bloqueio da troca obrigatória sobreviver a um reload ou a uma URL digitada à mão. O
`refresh` preserva o claim (renovar o token não é rota de fuga) e a troca **reemite** o par
— senão o access token em mãos continuaria carregando o claim antigo.

> ⚠️ **`tempPassword` é credencial em texto plano.** Ela existe porque a spec exige que o
> gestor consiga repassar a senha. Por isso: sai **apenas** no endpoint de detalhe
> (`GET /users/:id`, `GET /analysts/:id`) e só para quem tem posse do usuário — **nunca**
> no login, no `/users/me` ou em qualquer listagem — e é apagada no instante em que a
> senha definitiva é definida.

## Papéis e visibilidade (RBAC)

| Role | Pode |
|------|------|
| `ADMIN` | Super-usuário: tudo, incluindo **todas** as Maestras (mesmo as sem vínculo) |
| `MANAGER` | Gerencia **Analistas** + as Maestras **que ele mesmo cadastrou** |
| `ANALYST` | Gerencia apenas as Maestras **que ele mesmo cadastrou**. Sem acesso a `/analysts` |
| `USER` | A Maestra (cliente): acessa apenas os próprios dados |

Toda Maestra guarda `createdBy` = id de quem a cadastrou (vem **do token**, nunca do
corpo). Esse vínculo governa a listagem **e** o acesso direto: `GET`/`PATCH`/`DELETE`
`/users/:id` devolvem **403** se a Maestra não for do requisitante (exceto `ADMIN`).

## Maestras (CRUD)

Gestão das Maestras (role `USER`). Desativação é **soft delete** (`isActive`),
permitindo reativar.

- `POST /users/maestra` — cria uma Maestra e a vincula ao requisitante
  (`ADMIN`/`MANAGER`/`ANALYST`).
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
  e-mail de acesso quando o criador não tem perfil, caso do Manager).
- `GET /users/:id` — detalhe, com `createdByName` e as credenciais (`email`,
  `mustChangePassword`, `tempPassword`). É o **único** lugar onde a senha provisória sai.
- `PATCH /users/:id` — edita o perfil (`fullName`, `birthDate`, `birthTime`, `birthPlace`).
- `PATCH /users/:id/reactivate` — reativa (soft delete reverso).
- `DELETE /users/:id` — desativa (soft delete).

## Analistas (CRUD + supervisão)

Analistas são perfis da **mesma coleção `users`**, com `roles: ['ANALYST']` (doc
chaveado pelo id do `auth`, igual à Maestra) — não têm mapa natal. Todas as rotas
abaixo são exclusivas de **`ADMIN`/`MANAGER`**; o Analista não alcança nenhuma delas.

- `POST /analysts` — cria (`fullName` + `login: { email, password }`).
- `GET /analysts` — lista **paginada** (mesmos `page`/`pageSize`/`name`/`status` e
  headers `X-*` da listagem de Maestras).
- `GET /analysts/:id` — detalhe, com as credenciais (`email`, `mustChangePassword`,
  `tempPassword`). Devolve **404** se o id for de uma Maestra — a rota não é atalho para
  dados de cliente.
- `PATCH /analysts/:id/temp-password` — gera a senha provisória do Analista.
- `PATCH /analysts/:id` — edita o nome.
- `PATCH /analysts/:id/reactivate` — reativa.
- `DELETE /analysts/:id` — desativa (soft delete).
- `GET /analysts/:id/maestras` — **supervisão**: a carteira do Analista em DTO
  reduzido — apenas `fullName` e `isActive`. Sem `id` e sem dados natais, de modo que
  o Manager acompanha a carteira sem acessar os dados pessoais da cliente.

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
```
