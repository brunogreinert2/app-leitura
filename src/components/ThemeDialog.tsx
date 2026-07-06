import { useEffect, useState } from 'react'

/**
 * Esquemas de cor para baixa visão (referência: Perkins School for the
 * Blind). Não existe esquema universal — cada condição ocular prefere
 * um par texto/fundo diferente, então o app oferece os clássicos, todos
 * com contraste >= 7:1 (WCAG reforçado). As cores valem para o preview
 * dos botões; as definitivas vivem no CSS por [data-theme].
 */
export const THEMES = [
  { id: 'sepia', label: 'Sépia', bg: '#faf7f2', fg: '#2b2620' },
  { id: 'pergaminho', label: 'Pergaminho', bg: '#ccbc9d', fg: '#241a08' },
  { id: 'claro', label: 'Preto sobre branco', bg: '#ffffff', fg: '#000000' },
  { id: 'escuro', label: 'Branco sobre preto', bg: '#000000', fg: '#ffffff' },
  { id: 'amarelo', label: 'Amarelo sobre preto', bg: '#000000', fg: '#ffe600' },
  { id: 'verde', label: 'Verde sobre preto', bg: '#000000', fg: '#33ff33' },
  { id: 'amarelo-azul', label: 'Amarelo sobre azul', bg: '#001862', fg: '#ffe600' },
  { id: 'azul-noite', label: 'Azul-noite', bg: '#0a1128', fg: '#f2e8d5' },
  { id: 'azul-petroleo', label: 'Azul-petróleo', bg: '#062a30', fg: '#e8f4f1' },
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
export const FONTS = [
  { id: 'georgia', label: 'Serifada (padrão)', stack: "Georgia, 'Times New Roman', serif" },
  {
    id: 'atkinson',
    label: 'Atkinson Hyperlegible',
    stack: "'Atkinson Hyperlegible', Georgia, 'Times New Roman', serif",
  },
] as const

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
  onClose: () => void
}

/** O diálogo fica aberto ao escolher: o usuário compara os temas ao vivo. */
export function ThemeDialog({
  open,
  theme,
  onSelect,
  fontFamily,
  onSelectFontFamily,
  onClose,
}: Props) {
  if (!open) return null
  return (
    <>
      <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="copy-dialog theme-dialog" role="dialog" aria-label="Aparência">
        <h2>Aparência</h2>
        <p>Esquemas de alto contraste para baixa visão.</p>
        {THEMES.map((t) => (
          <button
            key={t.id}
            className="theme-option"
            style={{ background: t.bg, color: t.fg, borderColor: t.fg }}
            onClick={() => onSelect(t.id)}
            aria-pressed={theme === t.id}
          >
            <span className="theme-option-sample" aria-hidden="true">
              Aa
            </span>
            {t.label}
            {theme === t.id && <span className="theme-option-check"> ✓</span>}
          </button>
        ))}

        <h2 className="theme-dialog-section-title">Fonte de leitura</h2>
        <p>Atkinson Hyperlegible (Braille Institute of America) distingue melhor letras parecidas.</p>
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
            {f.label}
            {fontFamily === f.id && <span className="theme-option-check"> ✓</span>}
          </button>
        ))}

        <button className="copy-dialog-cancel" onClick={onClose}>
          Fechar
        </button>
      </div>
    </>
  )
}
