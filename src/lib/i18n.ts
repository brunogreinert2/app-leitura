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
  'aparencia.espacamento': 'Espaço entre letras',
  'aparencia.espacamentoNota':
    'Afastar as letras ajuda quando elas parecem coladas ou invadindo umas às outras — comum no astigmatismo. O espaço entre palavras acompanha, para a palavra não se desmanchar.',
  'aparencia.entrelinha': 'Espaço entre linhas',
  'aparencia.entrelinhaNota':
    'Linhas mais afastadas ajudam quando a linha de cima parece cair sobre a de baixo, ou quando o texto embaralha ao mudar de linha.',
  'fonte.georgia.dica': 'Desenho clássico de livro, com traço fino e grosso.',
  'fonte.atkinson.dica': 'Traço uniforme e letras bem diferentes entre si. Ajuda quando as letras parecem colar ou embaralhar.',
  'fonte.opendyslexic.dica': 'Base das letras mais pesada, contra a troca de b/d e p/q.',
  'peso.fino.dica': 'Menos tinta. Boa com letra grande.',
  'peso.medio.dica': 'O padrão.',
  'peso.grosso.dica': 'Devolve o traço fino que some quando a vista borra.',
  'espacamento.normal.dica': 'Como a fonte foi desenhada.',
  'espacamento.amplo.dica': 'Descola as letras umas das outras.',
  'espacamento.muitoAmplo.dica': 'Para quando cada letra invade a vizinha.',
  'entrelinha.minima': 'Mínima',
  'entrelinha.minima.dica': 'Mais texto por tela. Para quem lê de perto, com letra pequena.',
  'entrelinha.compacta.dica': 'Um pouco mais junto que o padrão.',
  'entrelinha.normal.dica': 'O padrão.',
  'entrelinha.ampla.dica': 'Separa bem, quando uma linha parece cair sobre a outra.',
  'espacamento.normal': 'Normal',
  'espacamento.amplo': 'Amplo',
  'espacamento.muitoAmplo': 'Muito amplo',
  'entrelinha.compacta': 'Compacta',
  'entrelinha.normal': 'Normal',
  'entrelinha.ampla': 'Ampla',
  'peso.fino': 'Fina',
  'peso.medio': 'Média',
  'peso.grosso': 'Grossa',
  'aparencia.idioma': 'Idioma · Language',
  'aparencia.qualEscolher': 'Qual ajuste é melhor para mim?',
  'aparencia.qualEscolherDica': 'Sugestões por condição de visão: baixa visão, presbiopia, miopia, astigmatismo, ceratocone, daltonismo, dislexia.',
  'pularParaOTexto': 'Pular para o texto',
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
  'detalhes.armazenamento': 'Armazenamento',
  'detalhes.armazenamentoProtegido': 'protegido — o navegador não apaga sozinho',
  'detalhes.armazenamentoFragil': 'ATENÇÃO: o navegador pode apagar seus textos. Exporte um backup.',
  'detalhes.armazenamentoDesconhecido': 'não informado por este navegador',
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
  'editor.localizar': 'Localizar',
  'editor.substituirPor': 'Substituir por',
  'editor.substituir': 'Substituir',
  'editor.substituirTudo': 'Substituir tudo',
  'editor.ocorrenciaDe': '{i} de {n}',
  'editor.semOcorrencia': 'nenhuma ocorrência',
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
  'soltar.titulo': 'Solte para adicionar aos seus textos',
  'soltar.formatos': 'Aceita .md e .txt',
  'soltar.varios': '{n} textos adicionados aos seus arquivos',
  'soltar.recusados': '{n} arquivo ignorado: só entram .md e .txt',
  'soltar.recusadosPlural': '{n} arquivos ignorados: só entram .md e .txt',
  'arquivos.remover': 'Remover “{titulo}” dos seus arquivos?',
  'arquivos.removerRotulo': 'Remover {titulo}',
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

  // — nomes das pastas da biblioteca —
  // A pasta é uma estrutura do app, não conteúdo do acervo: o leitor precisa
  // dela para NAVEGAR, então ela fala a língua do menu. As obras dentro dela
  // continuam intocadas. A chave é o nome da pasta sem acento e em maiúscula,
  // porque no disco ela é BIBLIAS e na tela pode ser Bíblias. Pasta que não
  // estiver aqui aparece com o próprio nome — o acervo pode crescer sem
  // depender desta lista.
  'pasta.BIBLIAS': 'Bíblias',
  'pasta.FILOSOFIA': 'Filosofia',
  'pasta.PERSONAGENS': 'Personagens',
  'pasta.GERAL': 'Geral',
  'pasta.MEUS ARQUIVOS': 'Meus arquivos',
  // — idioma (o segundo nível de todo acervo) —
  'pasta.INGLES': 'Inglês',
  'pasta.GREGO': 'Grego',
  'pasta.PORTUGUES': 'Português',
  'pasta.LATIM': 'Latim',
  'pasta.HEBRAICO': 'Hebraico',
  'pasta.ARABE': 'Árabe',
  // — escola e categoria (terceiro nível) —
  'pasta.ARISTOTELISMO': 'Aristotelismo',
  'pasta.BIOGRAFIA E DOXOGRAFIA': 'Biografia e Doxografia',
  'pasta.ESCOLASTICA': 'Escolástica',
  'pasta.ESPIRITUALIDADE': 'Espiritualidade',
  'pasta.ESTOICISMO': 'Estoicismo',
  'pasta.ESTOICISMO LATINO': 'Estoicismo Latino',
  'pasta.FILOSOFIA CLASSICA': 'Filosofia Clássica',
  'pasta.FILOSOFIA REPUBLICANA': 'Filosofia Republicana',
  'pasta.ILUMINISMO': 'Iluminismo',
  'pasta.MODERNA': 'Moderna',
  'pasta.MORALISTAS': 'Moralistas',
  'pasta.NEOPLATONISMO E TARDIA': 'Neoplatonismo e Tardia',
  'pasta.PATRISTICA': 'Patrística',
  'pasta.PLATONISMO': 'Platonismo',
  'pasta.PLATONISMO MEDIO': 'Platonismo Médio',
  'pasta.RENASCIMENTO': 'Renascimento',
  'pasta.INTERLINEARES GREGO': 'Interlineares Grego',
  'pasta.INTERLINEARES HEBRAICO': 'Interlineares Hebraico',
  'pasta.ANTIGO TESTAMENTO GREGO': 'Antigo Testamento Grego',
  'pasta.NOVO TESTAMENTO GREGO': 'Novo Testamento Grego',

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
  'aparencia.espacamento': 'Letter spacing',
  'aparencia.espacamentoNota':
    'Spacing letters out helps when they look crowded or run into each other — common with astigmatism. Word spacing follows, so words stay whole.',
  'aparencia.entrelinha': 'Line spacing',
  'aparencia.entrelinhaNota':
    'Wider lines help when the line above seems to fall onto the one below, or when your eye loses its place between lines.',
  'fonte.georgia.dica': 'Classic book letterform, with thick and thin strokes.',
  'fonte.atkinson.dica': 'Even strokes and letters that stay distinct. Helps when letters seem to run together.',
  'fonte.opendyslexic.dica': 'Heavier letter bottoms, against swapping b/d and p/q.',
  'peso.fino.dica': 'Less ink. Good at large sizes.',
  'peso.medio.dica': 'The default.',
  'peso.grosso.dica': 'Restores thin strokes that vanish when vision blurs.',
  'espacamento.normal.dica': 'As the typeface was drawn.',
  'espacamento.amplo.dica': 'Pulls the letters apart.',
  'espacamento.muitoAmplo.dica': 'For when each letter crowds its neighbour.',
  'entrelinha.minima': 'Minimum',
  'entrelinha.minima.dica': 'More text per screen. For reading up close at small sizes.',
  'entrelinha.compacta.dica': 'A little tighter than the default.',
  'entrelinha.normal.dica': 'The default.',
  'entrelinha.ampla.dica': 'Clear separation, when one line seems to fall onto the next.',
  'espacamento.normal': 'Normal',
  'espacamento.amplo': 'Wide',
  'espacamento.muitoAmplo': 'Extra wide',
  'entrelinha.compacta': 'Compact',
  'entrelinha.normal': 'Normal',
  'entrelinha.ampla': 'Wide',
  'fonte.georgia': 'Serif (default)',
  'peso.fino': 'Light',
  'peso.medio': 'Medium',
  'peso.grosso': 'Heavy',
  'aparencia.idioma': 'Idioma · Language',
  'aparencia.qualEscolher': 'Which settings are right for me?',
  'aparencia.qualEscolherDica': 'Suggestions by eye condition: low vision, presbyopia, short sight, astigmatism, keratoconus, colour blindness, dyslexia.',
  'pularParaOTexto': 'Skip to the text',
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
  'detalhes.armazenamento': 'Storage',
  'detalhes.armazenamentoProtegido': 'protected — the browser will not clear it on its own',
  'detalhes.armazenamentoFragil': 'WARNING: the browser may erase your texts. Export a backup.',
  'detalhes.armazenamentoDesconhecido': 'not reported by this browser',
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
  'editor.localizar': 'Find',
  'editor.substituirPor': 'Replace with',
  'editor.substituir': 'Replace',
  'editor.substituirTudo': 'Replace all',
  'editor.ocorrenciaDe': '{i} of {n}',
  'editor.semOcorrencia': 'no matches',
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

  'soltar.titulo': 'Drop to add to your texts',
  'soltar.formatos': 'Accepts .md and .txt',
  'soltar.varios': '{n} texts added to your files',
  'soltar.recusados': '{n} file ignored: only .md and .txt',
  'soltar.recusadosPlural': '{n} files ignored: only .md and .txt',
  'arquivos.remover': 'Remove “{titulo}” from your files?',
  'arquivos.removerRotulo': 'Remove {titulo}',
  'arquivos.exportarFalhou': 'Could not create the backup file.',
  'arquivos.importarAviso':
    'Importing replaces the theme, text size and reading memory saved on this device with the ones in the file. Your own texts are added (same id replaces). Continue?',
  'arquivos.importarFalhou': 'Could not import: invalid file, or from another app.',
  'arquivos.compartilhado': 'Shared {data}',

  'atualizacao.disponivel': 'A new version of the app is available.',
  'atualizacao.agora': 'Update now',
  'atualizacao.procurando': 'Checking for updates…',
  'atualizacao.emDia': 'You already have the latest version',

  'pasta.BIBLIAS': 'Bibles',
  'pasta.FILOSOFIA': 'Philosophy',
  'pasta.PERSONAGENS': 'Figures',
  'pasta.GERAL': 'General',
  'pasta.MEUS ARQUIVOS': 'My files',
  // — idioma (o segundo nível de todo acervo) —
  'pasta.INGLES': 'English',
  'pasta.GREGO': 'Greek',
  'pasta.PORTUGUES': 'Portuguese',
  'pasta.LATIM': 'Latin',
  'pasta.HEBRAICO': 'Hebrew',
  'pasta.ARABE': 'Arabic',
  // — escola e categoria (terceiro nível) —
  'pasta.ARISTOTELISMO': 'Aristotelianism',
  'pasta.BIOGRAFIA E DOXOGRAFIA': 'Biography and Doxography',
  'pasta.ESCOLASTICA': 'Scholasticism',
  'pasta.ESPIRITUALIDADE': 'Spirituality',
  'pasta.ESTOICISMO': 'Stoicism',
  'pasta.ESTOICISMO LATINO': 'Latin Stoicism',
  'pasta.FILOSOFIA CLASSICA': 'Classical Philosophy',
  'pasta.FILOSOFIA REPUBLICANA': 'Republican Philosophy',
  'pasta.ILUMINISMO': 'Enlightenment',
  'pasta.MODERNA': 'Modern',
  'pasta.MORALISTAS': 'Moralia',
  'pasta.NEOPLATONISMO E TARDIA': 'Neoplatonism and Late Antiquity',
  'pasta.PATRISTICA': 'Patristics',
  'pasta.PLATONISMO': 'Platonism',
  'pasta.PLATONISMO MEDIO': 'Middle Platonism',
  'pasta.RENASCIMENTO': 'Renaissance',
  'pasta.INTERLINEARES GREGO': 'Greek Interlinears',
  'pasta.INTERLINEARES HEBRAICO': 'Hebrew Interlinears',
  'pasta.ANTIGO TESTAMENTO GREGO': 'Greek Old Testament',
  'pasta.NOVO TESTAMENTO GREGO': 'Greek New Testament',

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

/**
 * Nome de pasta legível: `Novo_Testamento_Grego` -> `Novo Testamento Grego`.
 *
 * Pasta no disco não leva espaço sem custo, então o corpus usa underscore.
 * Isso é detalhe de sistema de arquivos e não tem por que aparecer na tela.
 * Espelha `nome_bonito()` do gerador_rolo.py, inclusive na remoção do prefixo
 * numérico de ordenação (`01_`, `02_`).
 */
function nomeBonito(bruto: string): string {
  return bruto.replace(/^\d+[_\-.\s]+/, '').replace(/[_-]+/g, ' ').trim() || bruto
}

/**
 * Nome de pasta da biblioteca no idioma do menu.
 *
 * Diferente de `traduzir`, aqui a chave NÃO é fixa: ela vem do caminho do
 * arquivo, que muda quando o acervo cresce. Por isso a busca é tolerante e o
 * padrão é devolver o nome cru — pasta nova aparece com o próprio nome em vez
 * de sumir ou mostrar `pasta.ALGO` na tela.
 *
 * A normalização tira acento e caixa porque a mesma pasta é BIBLIAS no disco
 * e Bíblias no catálogo. A faixa de diacríticos vai escrita com \u de
 * propósito: caractere combinante literal numa regex é invisível no editor e
 * some numa cópia mal codificada.
 *
 * AS DUAS LISTAS ANDAM JUNTAS. A mesma tabela existe como `ROTULO_EN` em
 * scripts/rolo/gerador_rolo.py, porque o rolo mostra as mesmas pastas para
 * quem chega pela URL crua. Mexeu numa, confira a outra — é a mesma regra
 * que já vale para os códigos de idioma e para as regex de âncora.
 */
export function rotuloDaPasta(idioma: Idioma, nome: string): string {
  const legivel = nomeBonito(nome)
  const chave = `pasta.${legivel.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()}`
  const dicionario = TEXTOS[idioma] as Record<string, string | undefined>
  return dicionario[chave] ?? legivel
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
