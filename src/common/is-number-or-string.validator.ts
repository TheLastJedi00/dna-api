import { ValidateBy, ValidationOptions, buildMessage } from 'class-validator';

/**
 * Aceita número finito ou texto não vazio. Usado no `fim` dos períodos de
 * Numerologia: os ciclos fechados terminam numa idade (número) e o último fica
 * em aberto (texto, ex.: "em diante").
 */
export function IsNumberOrString(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isNumberOrString',
      validator: {
        validate: (value: unknown) =>
          (typeof value === 'number' && Number.isFinite(value)) ||
          (typeof value === 'string' && value.trim().length > 0),
        defaultMessage: buildMessage(
          (each) => `${each}$property deve ser um número ou um texto`,
          options,
        ),
      },
    },
    options,
  );
}
