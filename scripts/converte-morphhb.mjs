// Converte a Bíblia Hebraica (Westminster Leningrad Codex, projeto
// OpenScriptures morphhb) de OSIS XML para os .md do app, espelhando o
// formato das Bíblias existentes (## Capítulo N, **v** texto ^ab-c-v).
// Só o TEXTO entra (a camada morfológica fica na fonte). Rodar:
//   node scripts/converte-morphhb.mjs [pasta-wlc]
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const wlcDir = process.argv[2] ?? 'C:/Projetos/Diaphoreus/fontes/morphhb/wlc'
const outDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'livros',
  'HEBRAICO',
  'Biblia_Hebraica_WLC',
)

// Ordem canônica do Tanakh na numeração cristã (mesma das outras
// Bíblias do app); abreviações idênticas às da Almeida — "Gn 1:1"
// resolve em qualquer Bíblia aberta.
const LIVROS = {
  Gen: [1, 'Gênesis', 'Gn'],
  Exod: [2, 'Êxodo', 'Ex'],
  Lev: [3, 'Levítico', 'Lv'],
  Num: [4, 'Números', 'Nm'],
  Deut: [5, 'Deuteronômio', 'Dt'],
  Josh: [6, 'Josué', 'Js'],
  Judg: [7, 'Juízes', 'Jz'],
  Ruth: [8, 'Rute', 'Rt'],
  '1Sam': [9, '1 Samuel', '1Sm'],
  '2Sam': [10, '2 Samuel', '2Sm'],
  '1Kgs': [11, '1 Reis', '1Rs'],
  '2Kgs': [12, '2 Reis', '2Rs'],
  '1Chr': [13, '1 Crônicas', '1Cr'],
  '2Chr': [14, '2 Crônicas', '2Cr'],
  Ezra: [15, 'Esdras', 'Ed'],
  Neh: [16, 'Neemias', 'Ne'],
  Esth: [17, 'Ester', 'Et'],
  Job: [18, 'Jó', 'Jó'],
  Ps: [19, 'Salmos', 'Sl'],
  Prov: [20, 'Provérbios', 'Pv'],
  Eccl: [21, 'Eclesiastes', 'Ec'],
  Song: [22, 'Cântico dos Cânticos', 'Ct'],
  Isa: [23, 'Isaías', 'Is'],
  Jer: [24, 'Jeremias', 'Jr'],
  Lam: [25, 'Lamentações', 'Lm'],
  Ezek: [26, 'Ezequiel', 'Ez'],
  Dan: [27, 'Daniel', 'Dn'],
  Hos: [28, 'Oseias', 'Os'],
  Joel: [29, 'Joel', 'Jl'],
  Amos: [30, 'Amós', 'Am'],
  Obad: [31, 'Obadias', 'Ob'],
  Jonah: [32, 'Jonas', 'Jn'],
  Mic: [33, 'Miqueias', 'Mq'],
  Nah: [34, 'Naum', 'Na'],
  Hab: [35, 'Habacuque', 'Hc'],
  Zeph: [36, 'Sofonias', 'Sf'],
  Hag: [37, 'Ageu', 'Ag'],
  Zech: [38, 'Zacarias', 'Zc'],
  Mal: [39, 'Malaquias', 'Ml'],
}

const NOMES_HEBRAICOS = {
  Gen: 'בראשית', Exod: 'שמות', Lev: 'ויקרא', Num: 'במדבר', Deut: 'דברים',
  Josh: 'יהושע', Judg: 'שופטים', Ruth: 'רות', '1Sam': 'שמואל א', '2Sam': 'שמואל ב',
  '1Kgs': 'מלכים א', '2Kgs': 'מלכים ב', '1Chr': 'דברי הימים א', '2Chr': 'דברי הימים ב',
  Ezra: 'עזרא', Neh: 'נחמיה', Esth: 'אסתר', Job: 'איוב', Ps: 'תהלים', Prov: 'משלי',
  Eccl: 'קהלת', Song: 'שיר השירים', Isa: 'ישעיהו', Jer: 'ירמיהו', Lam: 'איכה',
  Ezek: 'יחזקאל', Dan: 'דניאל', Hos: 'הושע', Joel: 'יואל', Amos: 'עמוס',
  Obad: 'עובדיה', Jonah: 'יונה', Mic: 'מיכה', Nah: 'נחום', Hab: 'חבקוק',
  Zeph: 'צפניה', Hag: 'חגי', Zech: 'זכריה', Mal: 'מלאכי',
}

function slug(nome) {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\W+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** Texto corrido de um <verse>: palavras + pontuação massorética. */
function verseText(inner) {
  const clean = inner.replace(/<note[\s\S]*?<\/note>/g, '')
  const tokens = []
  const re = /<w[^>]*>([^<]+)<\/w>|<seg type="([^"]+)"[^>]*>([^<]*)<\/seg>/g
  for (const m of clean.matchAll(re)) {
    if (m[1] !== undefined) tokens.push({ kind: 'w', text: m[1].replace(/\//g, '') })
    else tokens.push({ kind: m[2], text: m[3] })
  }
  let out = ''
  for (const t of tokens) {
    if (t.kind === 'w') {
      out += (out && !out.endsWith('־') ? ' ' : '') + t.text
    } else if (t.kind === 'x-maqqef' || t.kind === 'x-sof-pasuq') {
      out += t.text // colam na palavra anterior
    } else if (t.kind === 'x-paseq') {
      out += ' ' + t.text // ׀ fica isolado entre espaços
    }
    // x-pe / x-samekh (marcas de parágrafo massoréticas) ficam de fora
  }
  return out.trim()
}

mkdirSync(outDir, { recursive: true })
let done = 0
for (const file of readdirSync(wlcDir).filter((f) => f.endsWith('.xml'))) {
  const osisId = file.replace(/\.xml$/, '')
  const info = LIVROS[osisId]
  if (!info) continue // VerseMap e afins
  const [numero, nomePt, abrev] = info
  const xml = readFileSync(join(wlcDir, file), 'utf8')
  const prefix = abrev.toLowerCase().replace(/\s+/g, '')

  const lines = []
  lines.push('---')
  lines.push(`id: biblia-hebraica-wlc-${String(numero).padStart(2, '0')}-${slug(nomePt).toLowerCase()}`)
  lines.push('type: texto_primario')
  lines.push(`title: "${nomePt} (Bíblia Hebraica — WLC)"`)
  lines.push('author: null')
  lines.push('language: heb')
  lines.push('editor: "Westminster Leningrad Codex 4.20"')
  lines.push(
    'source: "Westminster Leningrad Codex via OpenScriptures morphhb (github.com/openscriptures/morphhb), 2026. Texto massorético, sem a camada morfológica."',
  )
  lines.push('license: "dominio_publico"')
  lines.push('publishable: true')
  lines.push('status: rascunho')
  lines.push('project: pedra_angular')
  lines.push(`livro_numero: ${numero}`)
  lines.push(`abrev: ${abrev}`)
  lines.push('sistema_referencia: versiculo')
  lines.push('tags: [biblia, hebraico, tanakh]')
  lines.push('---')
  lines.push('')
  lines.push(`# ${nomePt} — ${NOMES_HEBRAICOS[osisId]}`)
  lines.push('')

  for (const cm of xml.matchAll(/<chapter osisID="[^"]*?\.(\d+)"[^>]*>([\s\S]*?)<\/chapter>/g)) {
    const cap = cm[1]
    lines.push(`## Capítulo ${cap}`)
    lines.push('')
    for (const vm of cm[2].matchAll(/<verse osisID="[^"]*?\.(\d+)\.(\d+)"[^>]*>([\s\S]*?)<\/verse>/g)) {
      const verso = vm[2]
      const texto = verseText(vm[3])
      if (texto) lines.push(`**${verso}** ${texto} ^${prefix}-${cap}-${verso}`, '')
    }
  }

  const outName = `${String(numero).padStart(2, '0')}_${slug(nomePt)}_heb_wlc_sd.md`
  writeFileSync(join(outDir, outName), lines.join('\n'), 'utf8')
  done++
}
console.log(`WLC convertida: ${done} livros em ${outDir}`)
