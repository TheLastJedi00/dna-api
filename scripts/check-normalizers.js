// Verificação rápida das normalizações da migração (não toca no Firestore).
const assert = require('assert');
const m = require('./migrate-human-design-enums');

assert.strictEqual(
  m.normalizeTipoAurico('geradora manifestante'),
  'Geradora Manifestante',
);
assert.strictEqual(m.normalizeTipoAurico('Geradora'), 'Geradora');
assert.strictEqual(m.normalizeTipoAurico('projetora'), 'Projetora');
assert.strictEqual(m.normalizeTipoAurico('Manifestadora'), 'Manifestadora');
assert.strictEqual(m.normalizeTipoAurico('refletor'), 'Refletora');
assert.strictEqual(m.normalizeTipoAurico('Outra coisa'), null);

assert.strictEqual(m.normalizeAngulo('Direito'), 'Ângulo Direito');
assert.strictEqual(m.normalizeAngulo('ângulo esquerdo'), 'Ângulo Esquerdo');
assert.strictEqual(m.normalizeAngulo('Justa Posicao'), 'Justa Posição');
assert.strictEqual(m.normalizeAngulo(''), null);

assert.strictEqual(m.normalizeQuarto('3'), 'Quarto 3 - Dualidade');
assert.strictEqual(m.normalizeQuarto('Quarto 1'), 'Quarto 1 - Iniciação');
assert.strictEqual(m.normalizeQuarto('mutacao'), 'Quarto 4 - Mutação');
assert.strictEqual(m.normalizeQuarto('nenhum'), null);

// Documento legado completo: normaliza os enums, deriva o grupo e corrige os
// campos que hoje vêm do mapa do tipo áurico.
const legado = {
  tipo_aurico: 'Projetora',
  aura: 'Focalizada e Absorvente',
  energia: 'Não energético',
  palavra_chave: 'Guia',
  estrategia: 'Aguardar Pelo Convite',
  encarnacao: {
    angulo: 'Direito',
    cruz: 'Cruz da Explicação',
    quarto_de_cruz: '3',
  },
};
assert.deepStrictEqual(m.planChanges(legado).changes, {
  energia: 'Não Energético',
  estrategia: 'Aguardar os Convites',
  'encarnacao.angulo': 'Ângulo Direito',
  'encarnacao.grupo_de_destino': 'Pessoal',
  'encarnacao.quarto_de_cruz': 'Quarto 3 - Dualidade',
});

// Documento já no formato novo não gera escrita.
const novo = {
  tipo_aurico: 'Refletora',
  aura: 'Que Tira Amostras',
  energia: 'Não Energético',
  palavra_chave: 'Discernidora',
  estrategia: 'Aguardar o Ciclo Lunar',
  encarnacao: {
    angulo: 'Ângulo Esquerdo',
    grupo_de_destino: 'Transpessoal',
    quarto_de_cruz: 'Quarto 4 - Mutação',
  },
};
assert.deepStrictEqual(m.planChanges(novo).changes, {});

console.log('Normalizações OK');
