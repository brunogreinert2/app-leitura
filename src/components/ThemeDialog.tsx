import { useEffect, useState } from 'react'
import { useT, useIdiomaAtual } from './idiomaContext'
import { IDIOMAS } from '../lib/i18n'

/**
 * Esquemas de cor para baixa visão (referência: Perkins School for the
 * Blind). Não existe esquema universal — cada condição ocular prefere
 * um par texto/fundo diferente, então o app oferece os clássicos, todos
 * com contraste >= 7:1 (WCAG reforçado). As cores valem para o preview
 * dos botões; as definitivas vivem no CSS por [data-theme].
 */
/**
 * A ORDEM é a informação. Do topo para baixo: primeiro os pares clássicos de
 * baixa visão (contraste máximo, polaridade à escolha), depois os de conforto
 * de leitura, por último os decorativos. Ninguém precisa ler um rótulo
 * dizendo qual é qual — quem precisa de contraste pega os primeiros.
 *
 * Isso só pode ser assim porque os NOVE passam em todos os pisos medidos
 * (scripts/medir_contraste.py): não há tema decorativo se passando por
 * acessível, então não há o que desmentir. Se algum dia um tema entrar
 * reprovando, a ordem deixa de bastar e ele precisa de aviso — ou de conserto.
 *
 * Contraste texto/fundo medido em 2026-08-02, na ordem abaixo:
 * 21.00 · 21.00 · 16.57 · 15.49 · 12.68 · 14.03 · 15.38 · 13.49 · 9.17
 * (o número cai devagar porque conforto e decoração também respeitam o piso
 * de 7:1 — a diferença entre os grupos é de PROPÓSITO, não de aprovação.)
 */
export const THEMES = [
  // Baixa visão: os pares clássicos, contraste máximo
  { id: 'claro', chave: 'tema.claro', bg: '#ffffff', fg: '#000000' },
  { id: 'escuro', chave: 'tema.escuro', bg: '#000000', fg: '#ffffff' },
  { id: 'amarelo', chave: 'tema.amarelo', bg: '#000000', fg: '#ffe600' },
  { id: 'verde', chave: 'tema.verde', bg: '#000000', fg: '#33ff33' },
  { id: 'amarelo-azul', chave: 'tema.amarelo-azul', bg: '#001862', fg: '#ffe600' },
  // Conforto de leitura prolongada
  { id: 'sepia', chave: 'tema.sepia', bg: '#faf7f2', fg: '#2b2620' },
  { id: 'azul-noite', chave: 'tema.azul-noite', bg: '#0a1128', fg: '#f2e8d5' },
  { id: 'azul-petroleo', chave: 'tema.azul-petroleo', bg: '#062a30', fg: '#e8f4f1' },
  // Decorativo
  { id: 'pergaminho', chave: 'tema.pergaminho', bg: '#ccbc9d', fg: '#241a08' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

const STORAGE_KEY = 'app-theme'

export function useTheme() {
  const [theme, setTheme] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return THEMES.some((t) => t.id === saved) ? (saved as ThemeId) : 'sepia'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme)
    if (theme === 'sepia') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = theme
    const def = THEMES.find((t) => t.id === theme)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', def ? def.bg : '#2b2620')
  }, [theme])

  return { theme, setTheme }
}

/**
 * Atkinson Hyperlegible (Braille Institute of America): desenhada para
 * baixa visão, letras que não se confundem entre si ("l", "I", "1").
 * Embutida localmente (@font-face em styles.css) — sem CDN.
 */
/**
 * Nenhuma pilha alcança o sistema operacional (NORMAS.md N72 e N73). Duas
 * fontes nossas seguram tudo, nesta ordem:
 *
 *   Cardo             — o piso de leitura: latim com macrons, grego politônico
 *                       e hebraico com niqud, as três escritas do acervo
 *   DejaVu Guarnicao  — a última linha: cirílico, armênio, georgiano, árabe e
 *                       o que ninguém previu, já que o app importa arquivos
 *
 * Georgia e Times New Roman saíram das pilhas. A primeira não existe no
 * Android; a segunda é proprietária da Monotype, e não cabe num projeto que se
 * quer livre e offline.
 *
 * Sem isso, quem escolhia Atkinson ou OpenDyslexic lia todo o Novo Testamento
 * grego numa fonte do aparelho, porque nenhuma das duas tem grego — e o
 * resultado mudava de um aparelho para o outro.
 *
 * O id `georgia` continua o mesmo por ser id publicado (LEI 6): está gravado no
 * localStorage de quem já usa o app. Só o rótulo e a pilha mudaram.
 */
export const FONTS = [
  {
    id: 'georgia',
    chave: 'fonte.georgia' as const,
    stack: "'Cardo', 'DejaVu Guarnicao', serif",
  },
  {
    id: 'atkinson',
    rotulo: 'Atkinson Hyperlegible',
    stack: "'Atkinson Hyperlegible', 'Cardo', 'DejaVu Guarnicao', serif",
  },
  {
    id: 'opendyslexic',
    rotulo: 'OpenDyslexic',
    stack: "'OpenDyslexic', 'Cardo', 'DejaVu Guarnicao', serif",
  },
] as const

/**
 * Peso do traço. A Cardo é face filológica e tem menos tinta que a Georgia que
 * ela substituiu (111,7 contra 134,0, medido pela área do desenho). Quem vem da
 * Georgia sente o texto fino.
 *
 * Não dá para resolver com `font-weight`: a Cardo só tem 400 e 700, e o 700 tem
 * 161,5 de tinta — negrito, não corpo de texto. O contorno preenche o vão sem
 * trocar de fonte e sem pular de degrau.
 *
 * `medio` é o padrão porque é o que devolve o peso que o app tinha antes.
 */
/**
 * Peso do traço em PIXELS FÍSICOS do aparelho, não em `em`.
 *
 * Era `0.019em`, que num corpo de 18px dá 0,342px. Parece inofensivo, mas num
 * iPhone — três pixels físicos por ponto — isso vira 1,03 pixel físico. Logo
 * ACIMA de 1, que é o pior valor possível: dependendo de onde a linha cai na
 * grade de pixels, o mesmo traço arredonda ora para 1 pixel, ora para 2. O
 * texto sai em faixas, umas linhas mais grossas que as outras, sem ordem
 * aparente — e reembaralhando a cada mudança de corpo da letra, porque muda a
 * entrelinha e com ela a posição de cada linha na grade.
 *
 * Em `em` o problema ainda piorava com o zoom: a 60px o traço ia a 1,14px, que
 * em pixels físicos é 3,4 — fracionário de novo, e mais visível.
 *
 * Agora o número é inteiro em pixels do aparelho por construção: 0, 1 ou 2. O
 * mesmo traço em toda linha, em todo corpo de letra, em qualquer tela. O peso
 * deixa de crescer junto com a letra, o que é o certo: contorno é acabamento
 * do desenho da letra, não parte do tamanho dela.
 */
export const PESOS = [
  { id: 'fino', chave: 'peso.fino', pixels: 0 },
  { id: 'medio', chave: 'peso.medio', pixels: 1 },
  { id: 'grosso', chave: 'peso.grosso', pixels: 2 },
] as const

export type PesoId = (typeof PESOS)[number]['id']

const PESO_STORAGE_KEY = 'app-peso-traco'

/** Traduz "quantos pixels do aparelho" para o valor em CSS daquela tela. */
function aplicarPeso(pixels: number): void {
  const dpr = window.devicePixelRatio || 1
  document.documentElement.style.setProperty('--reading-stroke', `${pixels / dpr}px`)
}

export function usePesoTraco() {
  const [peso, setPeso] = useState<PesoId>(() => {
    const saved = localStorage.getItem(PESO_STORAGE_KEY)
    return PESOS.some((p) => p.id === saved) ? (saved as PesoId) : 'medio'
  })

  useEffect(() => {
    localStorage.setItem(PESO_STORAGE_KEY, peso)
    const def = PESOS.find((p) => p.id === peso) ?? PESOS[1]
    aplicarPeso(def.pixels)
  }, [peso])

  // Trocar de monitor ou mudar o zoom do navegador muda quantos pixels
  // físicos cabem num ponto — o traço precisa ser recalculado.
  useEffect(() => {
    const refazer = () => aplicarPeso((PESOS.find((p) => p.id === peso) ?? PESOS[1]).pixels)
    window.addEventListener('resize', refazer)
    return () => window.removeEventListener('resize', refazer)
  }, [peso])

  return { peso, setPeso }
}

export type FontFamilyId = (typeof FONTS)[number]['id']

const FONT_STORAGE_KEY = 'app-font-family'

export function useFontFamily() {
  const [fontFamily, setFontFamily] = useState<FontFamilyId>(() => {
    const saved = localStorage.getItem(FONT_STORAGE_KEY)
    return FONTS.some((f) => f.id === saved) ? (saved as FontFamilyId) : 'georgia'
  })

  useEffect(() => {
    localStorage.setItem(FONT_STORAGE_KEY, fontFamily)
    const def = FONTS.find((f) => f.id === fontFamily) ?? FONTS[0]
    document.documentElement.style.setProperty('--reading-font-family', def.stack)
  }, [fontFamily])

  return { fontFamily, setFontFamily }
}

interface Props {
  open: boolean
  theme: ThemeId
  onSelect: (id: ThemeId) => void
  fontFamily: FontFamilyId
  onSelectFontFamily: (id: FontFamilyId) => void
  peso: PesoId
  onSelectPeso: (id: PesoId) => void
  onClose: () => void
}

/** O diálogo fica aberto ao escolher: o usuário compara os temas ao vivo. */
export function ThemeDialog({
  open,
  theme,
  onSelect,
  fontFamily,
  onSelectFontFamily,
  peso,
  onSelectPeso,
  onClose,
}: Props) {
  const t = useT()
  const { idioma, setIdioma } = useIdiomaAtual()
  if (!open) return null
  return (
    <>
      <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="copy-dialog theme-dialog" role="dialog" aria-label={t('aparencia')}>
        <div className="dialog-topo">
          <h2>{t('aparencia')}</h2>
          <button className="dialog-fechar" onClick={onClose} aria-label={t('aparencia.fechar')}>
            <span aria-hidden="true">Χ</span>
          </button>
        </div>
        <p>{t('aparencia.subtitulo')}</p>
        {THEMES.map((tema) => (
          <button
            key={tema.id}
            className="theme-option"
            style={{ background: tema.bg, color: tema.fg, borderColor: tema.fg }}
            onClick={() => onSelect(tema.id)}
            aria-pressed={theme === tema.id}
          >
            <span className="theme-option-sample" aria-hidden="true">
              Aa
            </span>
            {t(tema.chave)}
            {theme === tema.id && <span className="theme-option-check"> ✓</span>}
          </button>
        ))}

        <h2 className="theme-dialog-section-title">{t('aparencia.fonte')}</h2>
        <p>{t('aparencia.fonteNota')}</p>
        {FONTS.map((f) => (
          <button
            key={f.id}
            className="theme-option font-option"
            onClick={() => onSelectFontFamily(f.id)}
            aria-pressed={fontFamily === f.id}
          >
            <span className="theme-option-sample" style={{ fontFamily: f.stack }} aria-hidden="true">
              Aa
            </span>
            {'chave' in f ? t(f.chave) : f.rotulo}
            {fontFamily === f.id && <span className="theme-option-check"> ✓</span>}
          </button>
        ))}

        <h2 className="theme-dialog-section-title">{t('aparencia.peso')}</h2>
        <p>{t('aparencia.pesoNota')}</p>
        {PESOS.map((p) => (
          <button
            key={p.id}
            className="theme-option font-option"
            onClick={() => onSelectPeso(p.id)}
            aria-pressed={peso === p.id}
          >
            <span
              className="theme-option-sample"
              style={{
                // Mesma conta do texto: pixels do aparelho, não `em`.
                WebkitTextStroke: `${p.pixels / (window.devicePixelRatio || 1)}px currentColor`,
                paintOrder: 'stroke fill',
              }}
              aria-hidden="true"
            >
              Aa
            </span>
            {t(p.chave)}
            {peso === p.id && <span className="theme-option-check"> ✓</span>}
          </button>
        ))}

        {/* Rótulo bilíngue de propósito: quem precisa TROCAR de idioma é
            justamente quem não está lendo o idioma atual. */}
        <h2 className="theme-dialog-section-title">{t('aparencia.idioma')}</h2>
        {IDIOMAS.map((i) => (
          <button
            key={i.id}
            className="theme-option font-option"
            onClick={() => setIdioma(i.id)}
            aria-pressed={idioma === i.id}
            lang={i.id === 'pt' ? 'pt-BR' : 'en'}
          >
            <span className="theme-option-sample" aria-hidden="true">
              {i.id === 'pt' ? 'pt' : 'en'}
            </span>
            {i.nome}
            {idioma === i.id && <span className="theme-option-check"> ✓</span>}
          </button>
        ))}

        <button className="copy-dialog-cancel" onClick={onClose}>
          {t('aparencia.fechar')}
        </button>
      </div>
    </>
  )
}
