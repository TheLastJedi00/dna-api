import { instanceToPlain } from 'class-transformer';

export type FirestoreData = { [key: string]: unknown };

function isPlainObject(value: unknown): value is FirestoreData {
  if (value === null || typeof value !== 'object') return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined).map(stripUndefined);
  }
  if (isPlainObject(value)) {
    const out: FirestoreData = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) out[key] = stripUndefined(item);
    }
    return out;
  }
  return value; // primitivos, null, Date, Timestamp, FieldValue…
}

/**
 * Converte uma entidade (ou objeto) no formato gravável pelo Firestore.
 *
 * O Firestore **recusa** `undefined` em qualquer campo. As entidades recebem
 * campos opcionais explicitamente no construtor (`this.createdBy =
 * data.createdBy`), então um documento antigo — anterior aos campos
 * `createdBy`/`email` (spec 004) ou `businessArea` (spec 007) — volta do
 * `findById` com essas chaves em `undefined` e o `set` seguinte falhava com 500.
 * Aqui a chave ausente simplesmente não é gravada; `null` continua valendo.
 */
export function toFirestoreData(entity: object): FirestoreData {
  return stripUndefined(instanceToPlain(entity)) as FirestoreData;
}
