import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateHumanDesignDto } from './dto/create-human-design.dto';
import { HumanDesign } from './entities/human-design.model';

/**
 * Cobre o que a spec 006 acrescentou ao Desenho Humano: os quatro campos que
 * viraram enumerados no formulário só aceitam os valores da lista, e o grupo
 * de destino chega ao prompt sem quebrar documentos gravados antes dele.
 */
function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'user-1',
    tipo_aurico: 'Geradora',
    aura: 'Aberta e Envolvente',
    energia: 'Gera Energia',
    palavra_chave: 'Construtora',
    estrategia: 'Responder à Vida',
    assinatura: 'Satisfação',
    tema_do_nao_ser: 'Frustração',
    autoridade: 'Sacral',
    perfil: '1/3',
    centros_energeticos: {
      definidos: 'Sacral',
      indefinidos: 'Garganta',
      abertos: 'Cabeça',
    },
    canais: [{ id: '34-20', nome: 'Do Carisma' }],
    ativacoes: {
      personalidade: { sol: 1, terra: 2, lua: 3 },
      desenho: { sol: 4, terra: 5, lua: 6 },
    },
    encarnacao: {
      angulo: 'Ângulo Direito',
      grupo_de_destino: 'Pessoal',
      cruz: 'Cruz da Explicação',
      portoes: '1, 2, 3',
      quarto_de_cruz: 'Quarto 1 - Iniciação',
    },
    ...overrides,
  };
}

async function validatePayload(payload: Record<string, unknown>) {
  return validate(plainToInstance(CreateHumanDesignDto, payload));
}

/** Nomes dos campos inválidos, incluindo os aninhados em `encarnacao`. */
function invalidFields(errors: Awaited<ReturnType<typeof validate>>) {
  return errors.flatMap((error) =>
    error.children?.length
      ? error.children.map((child) => child.property)
      : [error.property],
  );
}

describe('CreateHumanDesignDto', () => {
  it('aceita o payload que o formulário envia', async () => {
    expect(await validatePayload(makePayload())).toHaveLength(0);
  });

  it('recusa tipo áurico fora da lista', async () => {
    const errors = await validatePayload(
      makePayload({ tipo_aurico: 'Geradora Reflexiva' }),
    );
    expect(invalidFields(errors)).toContain('tipo_aurico');
  });

  it.each([
    ['angulo', 'Ângulo Torto'],
    ['grupo_de_destino', 'Impessoal'],
    ['quarto_de_cruz', 'Quarto 5 - Iniciação'],
  ])('recusa %s fora da lista', async (campo, valor) => {
    const errors = await validatePayload(
      makePayload({
        encarnacao: { ...makePayload().encarnacao, [campo]: valor },
      }),
    );
    expect(invalidFields(errors)).toContain(campo);
  });

  it('recusa encarnação sem grupo de destino', async () => {
    const { grupo_de_destino, ...encarnacao } = makePayload().encarnacao;
    void grupo_de_destino;
    const errors = await validatePayload(makePayload({ encarnacao }));
    expect(invalidFields(errors)).toContain('grupo_de_destino');
  });
});

describe('HumanDesign.toPrompt', () => {
  it('inclui o grupo de destino', () => {
    const prompt = new HumanDesign(makePayload()).toPrompt();
    expect(prompt).toContain('Encarnação (Grupo de Destino): Pessoal');
  });

  it('não quebra em documento gravado antes do grupo de destino', () => {
    const { grupo_de_destino, ...encarnacao } = makePayload().encarnacao;
    void grupo_de_destino;
    const antigo = new HumanDesign(makePayload({ encarnacao }));
    expect(antigo.toPrompt()).toContain('Encarnação (Grupo de Destino): ');
  });
});
