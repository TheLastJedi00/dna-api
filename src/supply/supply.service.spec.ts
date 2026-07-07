import { ConflictException } from '@nestjs/common';
import { SupplyService } from './supply.service';

/**
 * Cobre a lógica nova do Plano Perfeito: geração combinando os 3 pilares e a
 * pré-condição (os 3 devem existir). Dependências mockadas.
 */
describe('SupplyService — perfect-plain', () => {
  let service: SupplyService;
  let gemini: { generateTopics: jest.Mock };
  let hd: { findOneByUser: jest.Mock };
  let num: { findOneByUser: jest.Mock };
  let astro: { findOneByUser: jest.Mock };
  let users: { findOne: jest.Mock };
  let prompts: { findByPillar: jest.Mock; findByPillarAndModule: jest.Mock };
  let repo: { findById: jest.Mock; create: jest.Mock };
  let cache: { del: jest.Mock };

  beforeEach(() => {
    gemini = {
      generateTopics: jest.fn().mockResolvedValue([{ title: 't', items: ['i'] }]),
    };
    hd = { findOneByUser: jest.fn().mockResolvedValue({ toPrompt: () => 'HD' }) };
    num = { findOneByUser: jest.fn().mockResolvedValue({ toPrompt: () => 'NUM' }) };
    astro = {
      findOneByUser: jest.fn().mockResolvedValue({ toPrompt: () => 'ASTRO' }),
    };
    users = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'u1', toUserDataPrompt: () => 'USER' }),
    };
    prompts = {
      findByPillar: jest.fn().mockResolvedValue([{ prompt: 'MAIN' }]),
      findByPillarAndModule: jest.fn().mockResolvedValue({ prompt: 'PP' }),
    };
    repo = {
      findById: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((s) => Promise.resolve(s)),
    };
    cache = { del: jest.fn().mockResolvedValue(undefined) };

    service = new SupplyService(
      gemini as any,
      hd as any,
      num as any,
      users as any,
      prompts as any,
      repo as any,
      astro as any,
      cache as any,
    );
  });

  it('combina os 3 pilares no prompt do Gemini', async () => {
    await service.createModuleByUserIdAndPillar(
      'u1',
      'perfect-plain',
      'perfect-plain',
    );
    expect(gemini.generateTopics).toHaveBeenCalledTimes(1);
    const input = gemini.generateTopics.mock.calls[0][0] as string;
    expect(input).toContain('HD');
    expect(input).toContain('NUM');
    expect(input).toContain('ASTRO');
    expect(input).toContain('MAIN');
    expect(input).toContain('PP');
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it('nega geração se algum dos 3 pilares não existir (pré-condição)', async () => {
    num.findOneByUser.mockRejectedValue(new Error('not found'));
    await expect(
      service.createModuleByUserIdAndPillar('u1', 'perfect-plain', 'perfect-plain'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(gemini.generateTopics).not.toHaveBeenCalled();
  });

  it('createFullPillarByUserId gera o módulo único de perfect-plain', async () => {
    const result = await service.createFullPillarByUserId('u1', 'perfect-plain');
    expect(result).toHaveLength(1);
    expect(gemini.generateTopics).toHaveBeenCalledTimes(1);
  });
});
