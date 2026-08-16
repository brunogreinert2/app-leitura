import { useEffect, useState } from 'react'

/**
 * Idioma da INTERFACE — nunca do acervo.
 *
 * A distinção é a regra central: menu, botão e aviso seguem o aparelho; o
 * texto das obras fica no idioma em que foi escrito, sempre. O acervo é
 * poliglota (324 obras em inglês, 314 em grego, 209 em português, 186 em
 * latim, 39 em hebraico, 1 em árabe) e traduzir isso na tela seria falsificar
 * a fonte. Tradução, aqui, é obra nova com id próprio — como o corpus já faz
 * com Fédon em grego e em inglês.
 *
 * SEM BIBLIOTECA. São ~150 strings e dois idiomas: um dicionário e um hook
 * resolvem em ~1 KB, onde i18next custaria ~40 KB comprimidos. O CLAUDE.md
 * pede medir antes de somar dependência, e o app tem 11 pacotes em runtime.
 */
export type Idioma = 'pt' | 'en'

export const IDIOMAS: { id: Idioma; nome: string }[] = [
  { id: 'pt', nome: 'Português' },
  { id: 'en', nome: 'English' },
]

/**
 * O português é a base — o app nasceu brasileiro e é onde o texto é escrito
 * primeiro. O inglês é o alcance. As chaves ficam em português por isso: é a
 * língua em que as decisões são tomadas neste projeto.
 */
const PT = {
  // — biblioteca e catálogo —
  'biblioteca': 'Biblioteca',
  'biblioteca.abrir': 'Abrir biblioteca (pastas e pesquisa)',
  'biblioteca.fechar': 'Fechar biblioteca',
  'biblioteca.pesquisar': 'Pesquisar na biblioteca',
  'biblioteca.pesquisarDica': 'Pesquisar livro, autor, pasta…',
  'biblioteca.adicionar': '+ Adicionar arquivos',
  'biblioteca.novoTexto': '✏ Novo texto',
  'biblioteca.exportar': '⇩ Exportar meus dados',
  'biblioteca.importar': '⇧ Importar dados',
  'biblioteca.verificarAtualizacao': '⟳ Verificar atualização',
  'biblioteca.carregando': 'Carregando catálogo…',
  'biblioteca.erro': 'Não foi possível carregar o catálogo: {erro}',
  'catalogo.subtitulo': 'Pedra Angular',
  'catalogo.voltar': 'Voltar ao catálogo',

  // — leitura —
  'leitura.buscar': 'Buscar no texto',
  'leitura.diminuirLetra': 'Diminuir letra',
  'leitura.aumentarLetra': 'Aumentar letra',
  'leitura.carregando': 'Carregando…',
  'leitura.erro': 'Não foi possível carregar o livro: {erro}',
  'leitura.recolher': 'Recolher',
  'leitura.voltarAoTexto': '✕ Voltar ao texto',
  'leitura.abrirCompleto': 'Abrir completo',
  'leitura.carregandoVerbete': 'Carregando verbete…',
  'leitura.verbeteAusente': 'Verbete ainda não incluído no app.',
  'leitura.alvoIndisponivel': '“{alvo}” ainda não está disponível no app',

  // — sumário —
  'sumario': 'Sumário',
  'sumario.abrir': 'Abrir sumário',
  'sumario.fechar': 'Fechar sumário',
  'sumario.abrirMenu': 'Abrir menu (aparência e detalhes do acervo)',
  'sumario.recolherTudo': 'Recolher tudo',
  'sumario.expandirTudo': 'Expandir tudo',
  'sumario.copiarLivro': 'Copiar livro',
  'sumario.baixar': '⇩ Baixar .md',
  'sumario.detalhes': 'Detalhes',
  'sumario.editar': '✏ Editar',
  'sumario.indiceDeNomes': 'Índice de nomes',
  'sumario.recolherNomes': 'Recolher índice de nomes',
  'sumario.expandirNomes': 'Expandir índice de nomes',
  'sumario.recolherItem': 'Recolher {nome}',
  'sumario.expandirItem': 'Expandir {nome}',

  // — painéis fixos —
  'painel.fixarBiblioteca': 'Fixar a biblioteca ao lado do texto',
  'painel.soltarBiblioteca': 'Soltar a biblioteca',
  'painel.fixarSumario': 'Fixar o sumário ao lado do texto',
  'painel.soltarSumario': 'Soltar o sumário',
  'painel.fixar': 'Fixar ao lado do texto',

  // — menu do título —
  'titulo.maisAcoes': 'Mais ações deste título',
  'titulo.copiarTudo': 'Copiar — tudo',
  'titulo.copiarVisivel': 'Copiar — só visível',
  'titulo.imprimirTudo': 'Imprimir — tudo',
  'titulo.imprimirVisivel': 'Imprimir — só visível',

  // — aparência —
  'aparencia': 'Aparência',
  'aparencia.subtitulo': 'Esquemas de alto contraste para baixa visão.',
  'aparencia.fonte': 'Fonte de leitura',
  'aparencia.fonteNota':
    'Atkinson Hyperlegible (Braille Institute of America) distingue melhor letras parecidas.',
  'aparencia.peso': 'Peso da letra',
  'aparencia.pesoNota':
    'Mais grossa costuma ler melhor em tela; mais fina cansa menos no papel branco.',
  'tema.claro': 'Preto sobre branco',
  'tema.escuro': 'Branco sobre preto',
  'tema.amarelo': 'Amarelo sobre preto',
  'tema.verde': 'Verde sobre preto',
  'tema.amarelo-azul': 'Amarelo sobre azul',
  'tema.sepia': 'Sépia',
  'tema.azul-noite': 'Azul-noite',
  'tema.azul-petroleo': 'Azul-petróleo',
  'tema.pergaminho': 'Pergaminho',
  'fonte.georgia': 'Serifada (padrão)',
  'peso.fino': 'Fina',
  'peso.medio': 'Média',
  'peso.grosso': 'Grossa',
  'aparencia.idioma': 'Idioma · Language',
  'aparencia.fechar': 'Fechar',

  // — copiar —
  'copiar.feito': 'Copiado!',
  'copiar.falhou': 'Não foi possível copiar',

  // — detalhes —
  'detalhes': 'Detalhes',
  'detalhes.arquivo': 'Detalhes do arquivo',
  'detalhes.acervo': 'Detalhes do acervo',
  'detalhes.copiarLink': 'Copiar link desta obra',
  'detalhes.copiarLinkIA': 'Copiar link para IA',
  'detalhes.copiarLinkApp': 'Copiar link do app',
  'detalhes.copiarLinkAcervoIA': 'Copiar link do acervo para IA',
  'detalhes.copiado': 'Copiado ✓',
  'detalhes.obrasNoAcervo': 'Obras no acervo',
  'detalhes.personagens': 'Personagens',
  'detalhes.seusTextos': 'Seus textos',
  'detalhes.nenhumAinda': 'nenhum ainda',
  'detalhes.leitura': 'Leitura',
  'detalhes.offline': 'offline depois da primeira visita',
  'detalhes.textoFonte': 'Texto-fonte',
  'detalhes.dominioPublico': 'Markdown, em domínio público',
  'detalhes.carregando': 'ainda carregando…',
  'detalhes.tamanho': 'Tamanho do arquivo',
  'detalhes.secoes': 'Seções',
  'detalhes.caminho': 'Arquivo',

  // Rótulos dos campos do YAML da obra. Traduz-se o RÓTULO, nunca o valor:
  // "Autor" vira "Author", mas o autor continua sendo Plutarco.
  'campo.title': 'Título',
  'campo.subtitle': 'Subtítulo',
  'campo.original_title': 'Título original',
  'campo.author': 'Autor',
  'campo.translation': 'Tradução',
  'campo.year_original': 'Ano original',
  'campo.publisher': 'Editora',
  'campo.publication_year': 'Ano da edição',
  'campo.language': 'Idioma',
  'campo.area': 'Área',
  'campo.era': 'Época',
  'campo.born': 'Nascimento',
  'campo.died': 'Morte',
  'campo.nationality': 'Nacionalidade',
  'campo.source': 'Fonte',
  'campo.tags': 'Tags',
  'campo.coautoria': 'Coautoria',
  'campo.status': 'Status',
  'campo.type': 'Tipo',
  'campo.project': 'Projeto',

  // — editor —
  'editor': 'Editor de texto',
  'editor.titulo': 'Título do texto',
  'editor.salvar': 'Salvar',
  'editor.cancelar': 'Cancelar',
  'editor.colar': '📋 Colar da área de transferência',
  'editor.dica':
    'Digite ou cole seu texto aqui. Pode ser texto simples ou markdown — títulos com #, negrito com **, tudo vira leitura bonita.',
  'editor.descartar': 'Descartar o que foi digitado?',
  'editor.colarBloqueado':
    'O navegador bloqueou a leitura da área de transferência. Toque na caixa de texto e cole (Ctrl+V ou segurar → Colar).',
  'editor.textoDe': 'Texto de {data}',

  // — busca no texto —
  'busca.rotulo': 'Buscar no texto ou por referência canônica',
  'busca.dica': 'Buscar no texto ou referência (Gn 1:1)…',
  'busca.fechar': 'Fechar busca',
  'busca.anterior': 'Ocorrência anterior',
  'busca.proxima': 'Próxima ocorrência',

  // — voz —
  'voz.ouvir': 'Leitura em voz alta',
  'voz.parar': 'Parar leitura',

  // — arquivos do usuário —
  'arquivos.remover': 'Remover “{titulo}” dos seus arquivos?',
  'arquivos.exportarFalhou': 'Não foi possível gerar o arquivo de backup.',
  'arquivos.importarAviso':
    'Importar substitui o tema, o tamanho de letra e a memória de leitura salvos neste aparelho pelos do arquivo. Seus textos próprios são somados (mesmo id substitui). Continuar?',
  'arquivos.importarFalhou': 'Não foi possível importar: arquivo inválido ou de outro app.',
  'arquivos.compartilhado': 'Compartilhado {data}',

  // — atualização —
  'atualizacao.disponivel': 'Nova versão do app disponível.',
  'atualizacao.agora': 'Atualizar agora',
  'atualizacao.procurando': 'Procurando atualização…',
  'atualizacao.emDia': 'Você já está na versão mais recente',

  // — guia de boas-vindas (obra de id fixo, arquivo por idioma) —
  'guia.titulo': 'Bem-vindo ao Leitor',
  'guia.autor': 'Pedra Angular',
} as const

export type Chave = keyof typeof PT

/**
 * `Record<Chave, string>` de propósito: esquecer de traduzir uma chave nova
 * vira erro de compilação, não texto em português vazando na tela inglesa.
 */
const EN: Record<Chave, string> = {
  'biblioteca': 'Library',
  'biblioteca.abrir': 'Open library (folders and search)',
  'biblioteca.fechar': 'Close library',
  'biblioteca.pesquisar': 'Search the library',
  'biblioteca.pesquisarDica': 'Search book, author, folder…',
  'biblioteca.adicionar': '+ Add files',
  'biblioteca.novoTexto': '✏ New text',
  'biblioteca.exportar': '⇩ Export my data',
  'biblioteca.importar': '⇧ Import data',
  'biblioteca.verificarAtualizacao': '⟳ Check for updates',
  'biblioteca.carregando': 'Loading catalogue…',
  'biblioteca.erro': 'Could not load the catalogue: {erro}',
  'catalogo.subtitulo': 'Pedra Angular',
  'catalogo.voltar': 'Back to the catalogue',

  'leitura.buscar': 'Search in text',
  'leitura.diminuirLetra': 'Smaller text',
  'leitura.aumentarLetra': 'Larger text',
  'leitura.carregando': 'Loading…',
  'leitura.erro': 'Could not load the book: {erro}',
  'leitura.recolher': 'Collapse',
  'leitura.voltarAoTexto': '✕ Back to the text',
  'leitura.abrirCompleto': 'Open in full',
  'leitura.carregandoVerbete': 'Loading entry…',
  'leitura.verbeteAusente': 'This entry is not in the app yet.',
  'leitura.alvoIndisponivel': '“{alvo}” is not in the app yet',

  'sumario': 'Contents',
  'sumario.abrir': 'Open contents',
  'sumario.fechar': 'Close contents',
  'sumario.abrirMenu': 'Open menu (appearance and collection details)',
  'sumario.recolherTudo': 'Collapse all',
  'sumario.expandirTudo': 'Expand all',
  'sumario.copiarLivro': 'Copy book',
  'sumario.baixar': '⇩ Download .md',
  'sumario.detalhes': 'Details',
  'sumario.editar': '✏ Edit',
  'sumario.indiceDeNomes': 'Index of names',
  'sumario.recolherNomes': 'Collapse index of names',
  'sumario.expandirNomes': 'Expand index of names',
  'sumario.recolherItem': 'Collapse {nome}',
  'sumario.expandirItem': 'Expand {nome}',

  'painel.fixarBiblioteca': 'Pin the library beside the text',
  'painel.soltarBiblioteca': 'Unpin the library',
  'painel.fixarSumario': 'Pin the contents beside the text',
  'painel.soltarSumario': 'Unpin the contents',
  'painel.fixar': 'Pin beside the text',

  'titulo.maisAcoes': 'More actions for this heading',
  'titulo.copiarTudo': 'Copy — everything',
  'titulo.copiarVisivel': 'Copy — visible only',
  'titulo.imprimirTudo': 'Print — everything',
  'titulo.imprimirVisivel': 'Print — visible only',

  'aparencia': 'Appearance',
  'aparencia.subtitulo': 'High-contrast schemes for low vision.',
  'aparencia.fonte': 'Reading font',
  'aparencia.fonteNota':
    'Atkinson Hyperlegible (Braille Institute of America) tells similar letters apart more clearly.',
  'aparencia.peso': 'Letter weight',
  'aparencia.pesoNota':
    'Heavier usually reads better on screen; lighter tires less on white paper.',
  'tema.claro': 'Black on white',
  'tema.escuro': 'White on black',
  'tema.amarelo': 'Yellow on black',
  'tema.verde': 'Green on black',
  'tema.amarelo-azul': 'Yellow on blue',
  'tema.sepia': 'Sepia',
  'tema.azul-noite': 'Night blue',
  'tema.azul-petroleo': 'Teal',
  'tema.pergaminho': 'Parchment',
  'fonte.georgia': 'Serif (default)',
  'peso.fino': 'Light',
  'peso.medio': 'Medium',
  'peso.grosso': 'Heavy',
  'aparencia.idioma': 'Idioma · Language',
  'aparencia.fechar': 'Close',

  'copiar.feito': 'Copied!',
  'copiar.falhou': 'Could not copy',

  'detalhes': 'Details',
  'detalhes.arquivo': 'File details',
  'detalhes.acervo': 'Collection details',
  'detalhes.copiarLink': 'Copy link to this work',
  'detalhes.copiarLinkIA': 'Copy link for AI',
  'detalhes.copiarLinkApp': 'Copy link to the app',
  'detalhes.copiarLinkAcervoIA': 'Copy collection link for AI',
  'detalhes.copiado': 'Copied ✓',
  'detalhes.obrasNoAcervo': 'Works in the collection',
  'detalhes.personagens': 'Figures',
  'detalhes.seusTextos': 'Your texts',
  'detalhes.nenhumAinda': 'none yet',
  'detalhes.leitura': 'Reading',
  'detalhes.offline': 'offline after the first visit',
  'detalhes.textoFonte': 'Source text',
  'detalhes.dominioPublico': 'Markdown, in the public domain',
  'detalhes.carregando': 'still loading…',
  'detalhes.tamanho': 'File size',
  'detalhes.secoes': 'Sections',
  'detalhes.caminho': 'File',

  'campo.title': 'Title',
  'campo.subtitle': 'Subtitle',
  'campo.original_title': 'Original title',
  'campo.author': 'Author',
  'campo.translation': 'Translation',
  'campo.year_original': 'Original year',
  'campo.publisher': 'Publisher',
  'campo.publication_year': 'Edition year',
  'campo.language': 'Language',
  'campo.area': 'Field',
  'campo.era': 'Period',
  'campo.born': 'Born',
  'campo.died': 'Died',
  'campo.nationality': 'Nationality',
  'campo.source': 'Source',
  'campo.tags': 'Tags',
  'campo.coautoria': 'Co-authorship',
  'campo.status': 'Status',
  'campo.type': 'Type',
  'campo.project': 'Project',

  'editor': 'Text editor',
  'editor.titulo': 'Title of the text',
  'editor.salvar': 'Save',
  'editor.cancelar': 'Cancel',
  'editor.colar': '📋 Paste from clipboard',
  'editor.dica':
    'Type or paste your text here. Plain text or markdown — headings with #, bold with **, it all turns into proper reading.',
  'editor.descartar': 'Discard what you typed?',
  'editor.colarBloqueado':
    'The browser blocked reading the clipboard. Tap the text box and paste (Ctrl+V, or hold → Paste).',
  'editor.textoDe': 'Text from {data}',

  'busca.rotulo': 'Search text or canonical reference',
  'busca.dica': 'Search text or reference (Gn 1:1)…',
  'busca.fechar': 'Close search',
  'busca.anterior': 'Previous match',
  'busca.proxima': 'Next match',

  'voz.ouvir': 'Read aloud',
  'voz.parar': 'Stop reading',

  'arquivos.remover': 'Remove “{titulo}” from your files?',
  'arquivos.exportarFalhou': 'Could not create the backup file.',
  'arquivos.importarAviso':
    'Importing replaces the theme, text size and reading memory saved on this device with the ones in the file. Your own texts are added (same id replaces). Continue?',
  'arquivos.importarFalhou': 'Could not import: invalid file, or from another app.',
  'arquivos.compartilhado': 'Shared {data}',

  'atualizacao.disponivel': 'A new version of the app is available.',
  'atualizacao.agora': 'Update now',
  'atualizacao.procurando': 'Checking for updates…',
  'atualizacao.emDia': 'You already have the latest version',

  'guia.titulo': 'Welcome to the Reader',
  'guia.autor': 'Pedra Angular',
}

const TEXTOS: Record<Idioma, Record<Chave, string>> = { pt: PT, en: EN }

/** Tradução pura, sem hook — serve ao contexto e a qualquer uso fora de componente. */
export function traduzir(
  idioma: Idioma,
  chave: Chave,
  params?: Record<string, string | number>,
): string {
  const bruto = TEXTOS[idioma][chave] ?? PT[chave] ?? chave
  if (!params) return bruto
  return bruto.replace(/\{(\w+)\}/g, (inteiro, nome: string) =>
    nome in params ? String(params[nome]) : inteiro,
  )
}

const CHAVE_GUARDADA = 'app-idioma'

function ehIdioma(v: unknown): v is Idioma {
  return v === 'pt' || v === 'en'
}

/**
 * Ordem de decisão: `?lang=` na URL, depois a escolha guardada, depois o
 * aparelho, e só então o inglês.
 *
 * O aparelho é lido de `navigator.languages`, que é uma LISTA ordenada de
 * preferências — quem tem "es-AR, pt-BR, en" prefere português a inglês, e
 * uma leitura só de `navigator.language` perderia isso.
 *
 * O padrão final é inglês, não português: quem chega com aparelho em japonês
 * tem mais chance de ler inglês. Aparelho em português continua caindo em
 * português pela lista, que é o caso da maioria de casa.
 */
export function idiomaInicial(): Idioma {
  try {
    const daUrl = new URLSearchParams(window.location.search).get('lang')
    if (ehIdioma(daUrl)) return daUrl
    const guardado = localStorage.getItem(CHAVE_GUARDADA)
    if (ehIdioma(guardado)) return guardado
    for (const tag of navigator.languages ?? [navigator.language]) {
      const base = tag.toLowerCase().split('-')[0]
      if (base === 'pt') return 'pt'
      if (base === 'en') return 'en'
    }
  } catch {
    /* sem window/localStorage: cai no padrão */
  }
  return 'en'
}

export function useIdioma() {
  const [idioma, setIdioma] = useState<Idioma>(idiomaInicial)

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_GUARDADA, idioma)
    } catch {
      /* idem */
    }
    // O <html lang> acompanha a interface. Sem isto, o leitor de tela lê
    // inglês com fonética portuguesa — o mesmo defeito que corrigimos em 326
    // páginas do /rolo, voltando pela porta da frente.
    document.documentElement.lang = idioma === 'pt' ? 'pt-BR' : 'en'
  }, [idioma])

  const t = (chave: Chave, params?: Record<string, string | number>) =>
    traduzir(idioma, chave, params)

  return { idioma, setIdioma, t }
}

export type Tradutor = ReturnType<typeof useIdioma>['t']
