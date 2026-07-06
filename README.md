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
| `DEV_ORIGIN` | não | Origem liberada no CORS |
| `PORT` | não (8080) | Porta HTTP |

## Autenticação

- `POST /auth` — login por credenciais → `{ access_token, refresh_token }`.
- `POST /auth/refresh` — renova o par a partir do refresh (rotação; nega se revogado).
- `POST /auth/logout` — revoga o refresh informado.

## Health

- `GET /health` — status da API, conectividade do Redis e métricas de cache.

## Scripts

```bash
npm run start:dev     # dev com watch
npm run build         # build de produção (nest build)
npm run start:prod    # roda dist/main
npm test              # testes (jest)
```
