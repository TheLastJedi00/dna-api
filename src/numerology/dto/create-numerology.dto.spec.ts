import { ValidationPipe } from '@nestjs/common';
import { CreateNumerologyDto } from './create-numerology.dto';
import { UpdateNumerologyDto } from './update-numerology.dto';

// Mesma configuração do main.ts: campo sem decorator é recusado.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const periodo = (fim: unknown) => ({ inicio: 0, fim, numero: 1 });

function payload(fim: unknown = 28) {
  return {
    userId: 'u1',
    perfil: {
      motivacao: 1,
      impressao: 2,
      expressao: 3,
      destino: 4,
      missao: 5,
      data_natalicia: 6,
      numero_psiquico: 7,
      talento_oculto: 8,
    },
    ciclos_de_vida: [periodo(28), periodo(56), periodo(fim)],
    desafios: [periodo(28), periodo(56), periodo(fim)],
    momentos_decisivos: [periodo(28), periodo(37), periodo(46), periodo(fim)],
    ano_pessoal: {
      atual: { numero: 1, validade: '2026' },
      proximo: { numero: 2, validade: '2027' },
    },
    extras: {
      tendencias_ocultas: [1],
      respostas_subconscientes: 3,
      numeros_favoraveis: [4],
    },
  };
}

async function errorsOf(metatype: unknown, body: unknown): Promise<string[]> {
  try {
    await pipe.transform(body, { type: 'body', metatype: metatype as never });
    return [];
  } catch (e) {
    return (e as { getResponse(): { message: string[] } }).getResponse()
      .message;
  }
}

describe('Numerologia — campo fim dos períodos', () => {
  it.each([
    ['número', 28],
    ['texto (último ciclo em aberto)', 'em diante'],
  ])('aceita fim como %s no cadastro e na edição', async (_label, fim) => {
    expect(await errorsOf(CreateNumerologyDto, payload(fim))).toEqual([]);
    expect(await errorsOf(UpdateNumerologyDto, payload(fim))).toEqual([]);
  });

  it('recusa fim ausente', async () => {
    const body = payload();
    delete (body.ciclos_de_vida[2] as { fim?: unknown }).fim;
    const errors = await errorsOf(CreateNumerologyDto, body);
    expect(errors.some((m) => m.includes('ciclos_de_vida.2.fim'))).toBe(true);
  });

  it.each([
    ['vazio', ''],
    ['booleano', true],
    ['objeto', { a: 1 }],
  ])('recusa fim %s', async (_label, fim) => {
    const errors = await errorsOf(CreateNumerologyDto, payload(fim));
    expect(errors.some((m) => m.includes('fim'))).toBe(true);
  });
});
