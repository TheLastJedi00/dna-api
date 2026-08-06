/**
 * Migração dos registros de Desenho Humano anteriores à spec 006.
 *
 * Normaliza os campos que viraram enumerados no formulário e preenche o
 * `grupo_de_destino`, que não existia:
 *
 *   tipo_aurico           "geradora manifestante"  -> "Geradora Manifestante"
 *   encarnacao.angulo     "Direito"                -> "Ângulo Direito"
 *   encarnacao.quarto_..  "3"                      -> "Quarto 3 - Dualidade"
 *   encarnacao.grupo_..   (ausente)                -> derivado do ângulo
 *   aura/energia/palavra_chave/estrategia          -> derivados do tipo áurico
 *
 * Uso (a partir de `api/`):
 *   node scripts/migrate-human-design-enums.js            # simulação, não grava
 *   node scripts/migrate-human-design-enums.js --apply    # grava
 *
 * A simulação imprime o diff de cada documento. O modo `--apply` salva um
 * backup de todos os documentos antes de escrever e só atualiza os campos que
 * mudam (`update`, não `set`).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const APPLY = process.argv.includes('--apply');

const TIPO_AURICO_MAP = {
  Geradora: {
    aura: 'Aberta e Envolvente',
    energia: 'Gera Energia',
    palavra_chave: 'Construtora',
    estrategia: 'Responder à Vida',
  },
  'Geradora Manifestante': {
    aura: 'Aberta e Envolvente',
    energia: 'Gera Energia',
    palavra_chave: 'Construtora',
    estrategia: 'Responder à Vida',
  },
  Projetora: {
    aura: 'Focalizada e Absorvente',
    energia: 'Não Energético',
    palavra_chave: 'Guia',
    estrategia: 'Aguardar os Convites',
  },
  Manifestadora: {
    aura: 'Fechada e Repelente',
    energia: 'Inicia Energia',
    palavra_chave: 'Guia',
    estrategia: 'Informar Antes de Agir',
  },
  Refletora: {
    aura: 'Que Tira Amostras',
    energia: 'Não Energético',
    palavra_chave: 'Discernidora',
    estrategia: 'Aguardar o Ciclo Lunar',
  },
};

const ANGULO_GRUPO_MAP = {
  'Ângulo Direito': 'Pessoal',
  'Ângulo Esquerdo': 'Transpessoal',
  'Justa Posição': 'Justa Posição',
};

const QUARTOS = [
  'Quarto 1 - Iniciação',
  'Quarto 2 - Civilização',
  'Quarto 3 - Dualidade',
  'Quarto 4 - Mutação',
];

/** Sem acento, minúsculo — para casar "Ângulo Direito" com "angulo direito". */
const slug = (v) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

function normalizeTipoAurico(valor) {
  const s = slug(valor);
  if (!s) return null;
  if (s.includes('manifestante')) return 'Geradora Manifestante';
  if (s.includes('gerador')) return 'Geradora';
  if (s.includes('projetor')) return 'Projetora';
  if (s.includes('manifestador')) return 'Manifestadora';
  if (s.includes('refletor')) return 'Refletora';
  return null;
}

function normalizeAngulo(valor) {
  const s = slug(valor);
  if (!s) return null;
  if (s.includes('direit')) return 'Ângulo Direito';
  if (s.includes('esquerd')) return 'Ângulo Esquerdo';
  if (s.includes('justa')) return 'Justa Posição';
  return null;
}

function normalizeQuarto(valor) {
  const s = slug(valor);
  if (!s) return null;
  const nomes = ['iniciacao', 'civilizacao', 'dualidade', 'mutacao'];
  const porNome = nomes.findIndex((nome) => s.includes(nome));
  if (porNome >= 0) return QUARTOS[porNome];
  const numero = s.match(/[1-4]/);
  return numero ? QUARTOS[Number(numero[0]) - 1] : null;
}

/** Campos a atualizar no documento, em notação de caminho do Firestore. */
function planChanges(data) {
  const changes = {};
  const encarnacao = data.encarnacao || {};

  const tipo = normalizeTipoAurico(data.tipo_aurico);
  if (tipo) {
    if (tipo !== data.tipo_aurico) changes['tipo_aurico'] = tipo;
    for (const [campo, valor] of Object.entries(TIPO_AURICO_MAP[tipo])) {
      if (data[campo] !== valor) changes[campo] = valor;
    }
  }

  const angulo = normalizeAngulo(encarnacao.angulo);
  if (angulo) {
    if (angulo !== encarnacao.angulo) changes['encarnacao.angulo'] = angulo;
    const grupo = ANGULO_GRUPO_MAP[angulo];
    if (encarnacao.grupo_de_destino !== grupo) {
      changes['encarnacao.grupo_de_destino'] = grupo;
    }
  }

  const quarto = normalizeQuarto(encarnacao.quarto_de_cruz);
  if (quarto && quarto !== encarnacao.quarto_de_cruz) {
    changes['encarnacao.quarto_de_cruz'] = quarto;
  }

  return { changes, tipo, angulo, quarto };
}

function currentValue(data, campo) {
  return campo.startsWith('encarnacao.')
    ? (data.encarnacao || {})[campo.slice('encarnacao.'.length)]
    : data[campo];
}

// Exportado para o teste das normalizações (scripts/migrate-human-design-enums.spec.js).
module.exports = {
  normalizeTipoAurico,
  normalizeAngulo,
  normalizeQuarto,
  planChanges,
};

if (require.main !== module) {
  return;
}

(async () => {
  const cred = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_JSON, 'base64').toString(
      'utf8',
    ),
  );
  admin.initializeApp({ credential: admin.credential.cert(cred) });
  const db = admin.firestore();

  console.log(`Projeto: ${cred.project_id}`);
  console.log(
    `Modo: ${APPLY ? 'APLICANDO (grava)' : 'SIMULAÇÃO (não grava)'}\n`,
  );

  const snap = await db.collection('human-design').get();
  console.log(`Documentos na coleção: ${snap.size}\n`);

  if (APPLY) {
    const backup = path.join(
      __dirname,
      `backup-human-design-${Date.now()}.json`,
    );
    fs.writeFileSync(
      backup,
      JSON.stringify(
        snap.docs.map((doc) => ({ id: doc.id, data: doc.data() })),
        null,
        2,
      ),
    );
    console.log(`Backup: ${backup}\n`);
  }

  let alterados = 0;
  const pendencias = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const { changes, tipo, angulo, quarto } = planChanges(data);

    const naoReconhecidos = [
      !tipo && data.tipo_aurico !== undefined
        ? `tipo_aurico="${data.tipo_aurico}"`
        : null,
      !angulo && (data.encarnacao || {}).angulo !== undefined
        ? `angulo="${data.encarnacao.angulo}"`
        : null,
      !quarto && (data.encarnacao || {}).quarto_de_cruz !== undefined
        ? `quarto_de_cruz="${data.encarnacao.quarto_de_cruz}"`
        : null,
    ].filter(Boolean);

    if (naoReconhecidos.length) {
      pendencias.push(`${doc.id}: ${naoReconhecidos.join(', ')}`);
    }

    const campos = Object.keys(changes);
    if (!campos.length) {
      console.log(`= ${doc.id} — já normalizado`);
      continue;
    }

    alterados++;
    console.log(`~ ${doc.id}`);
    for (const campo of campos) {
      const antes = currentValue(data, campo);
      console.log(
        `    ${campo}: ${antes === undefined ? '(ausente)' : JSON.stringify(antes)} -> ${JSON.stringify(changes[campo])}`,
      );
    }

    if (APPLY) {
      await db.collection('human-design').doc(doc.id).update(changes);
    }
  }

  console.log(
    `\n${alterados} de ${snap.size} documento(s) ${APPLY ? 'atualizados' : 'seriam atualizados'}.`,
  );

  if (pendencias.length) {
    console.log('\nValores não reconhecidos (deixados como estão):');
    pendencias.forEach((p) => console.log(`  - ${p}`));
  }

  process.exit(0);
})().catch((e) => {
  console.error('Falha na migração:', e.message);
  process.exit(1);
});
