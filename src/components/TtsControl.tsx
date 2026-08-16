import { useEffect, useRef, useState, type RefObject } from 'react'
import {
  idiomaDoTexto,
  escritaDaAncora,
  vozPara,
  NOME_DA_ESCRITA,
  type Escrita,
} from '../lib/idioma'
import { useT } from './idiomaContext'

/**
 * Leitura em voz alta via Web Speech API (SpeechSynthesis) — 100% do
 * navegador, sem biblioteca e sem rede: as vozes instaladas no
 * aparelho falam mesmo offline (as poucas marcadas "(online)" são as
 * vozes de nuvem do próprio sistema, nunca uma dependência nossa).
 *
 * Lê o que está ABERTO na tela, a partir do ponto em que a leitura
 * visual parou; o parágrafo falado ganha destaque e acompanha a rolagem.
 */

const VOICE_KEY = 'tts-voice'
const RATE_KEY = 'tts-rate'
const MAX_CHUNK = 260

interface Props {
  bodyRef: RefObject<HTMLElement | null>
  /** Idioma declarado no cabeçalho do arquivo — padrão de cada trecho. */
  escritaPadrao: Escrita
}

type Status = 'idle' | 'speaking' | 'paused'

interface SpeechItem {
  /** Escrita do trecho — decide a VOZ. Ver lib/idioma.ts. */
  escrita: Escrita
  el: HTMLElement
  text: string
  first: boolean
}

/** Texto falável de um bloco: sem chamadas de nota, setas e marcadores. */
function speakableText(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement
  clone
    .querySelectorAll('sup, .section-arrow, .section-close, .marker')
    .forEach((n) => n.remove())
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/** Quebra em frases de até ~260 chars (o sintetizador engasga em texto longo). */
function chunks(text: string): string[] {
  const sentences = text.split(/(?<=[.!?;:])\s+/)
  const out: string[] = []
  let acc = ''
  for (const s of sentences) {
    if (acc && acc.length + s.length + 1 > MAX_CHUNK) {
      out.push(acc)
      acc = s
    } else {
      acc = acc ? `${acc} ${s}` : s
    }
  }
  if (acc) out.push(acc)
  return out
}

/** Blocos legíveis visíveis, do ponto atual da tela até o fim do aberto. */
function collectItems(root: HTMLElement, padrao: Escrita): SpeechItem[] {
  // .reading-heading (não h1..h6 fixo): headings além do 6º nível não
  // têm nome de tag previsível (CommonMark trava ATX em 6 "#", a
  // profundidade real vem por outro caminho — ver remarkDeepHeadings).
  const blocks = [...root.querySelectorAll<HTMLElement>('p, .reading-heading, li')].filter(
    (el) =>
      !el.closest('.footnote-box') &&
      !(el.tagName === 'LI' && el.querySelector('p')) &&
      el.offsetParent !== null,
  )
  const start = blocks.findIndex((el) => el.getBoundingClientRect().bottom > 120)
  const visible = start === -1 ? blocks : blocks.slice(start)
  const items: SpeechItem[] = []
  for (const el of visible) {
    const text = speakableText(el)
    if (!text) continue
    /* Etiqueta escrita no arquivo (`^por`, `^eng`) vence a detecção: o que o
       autor declarou não se discute.

       O `closest` PRECISA parar dentro do corpo do livro. O documento tem
       `<html lang="pt-BR">`, então uma busca solta acharia sempre pt-BR e
       desligaria a detecção automática no texto inteiro — o bug de sotaque de
       volta, agora sem sintoma visível no código. */
    const marcado = el.closest<HTMLElement>('[lang]')
    const declarado = marcado && root.contains(marcado) ? marcado.getAttribute('lang') : null
    const escrita = (declarado && escritaDaAncora(declarado)) || idiomaDoTexto(text, padrao)
    chunks(text).forEach((t, i) => items.push({ el, text: t, first: i === 0, escrita }))
  }
  return items
}

export function TtsControl({ bodyRef, escritaPadrao }: Props) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceURI, setVoiceURI] = useState(() => localStorage.getItem(VOICE_KEY) ?? '')
  const [rate, setRate] = useState(() => {
    const saved = Number(localStorage.getItem(RATE_KEY))
    return saved >= 0.5 && saved <= 1.6 ? saved : 1
  })
  const queueRef = useRef<SpeechItem[]>([])
  const indexRef = useRef(0)
  const currentElRef = useRef<HTMLElement | null>(null)
  const stoppedRef = useRef(false)
  /** Escritas já avisadas como sem voz — o aviso aparece uma vez por leitura. */
  const avisadosRef = useRef<Set<Escrita>>(new Set())
  const [aviso, setAviso] = useState('')

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  // Vozes carregam de forma assíncrona; pt-BR/pt primeiro na lista
  useEffect(() => {
    if (!supported) return
    const load = () => {
      const all = speechSynthesis.getVoices()
      const weight = (v: SpeechSynthesisVoice) =>
        v.lang.toLowerCase().startsWith('pt-br') ? 0 : v.lang.toLowerCase().startsWith('pt') ? 1 : 2
      setVoices([...all].sort((a, b) => weight(a) - weight(b) || a.name.localeCompare(b.name)))
    }
    load()
    speechSynthesis.addEventListener('voiceschanged', load)
    return () => speechSynthesis.removeEventListener('voiceschanged', load)
  }, [supported])

  useEffect(() => {
    localStorage.setItem(RATE_KEY, String(rate))
  }, [rate])
  useEffect(() => {
    if (voiceURI) localStorage.setItem(VOICE_KEY, voiceURI)
  }, [voiceURI])

  const clearHighlight = () => {
    currentElRef.current?.classList.remove('tts-current')
    currentElRef.current = null
  }

  const stop = () => {
    stoppedRef.current = true
    speechSynthesis.cancel()
    clearHighlight()
    setStatus('idle')
  }

  // Livro trocou / componente saiu: silêncio
  useEffect(() => () => stop(), []) // eslint-disable-line react-hooks/exhaustive-deps

  const pickVoice = (): SpeechSynthesisVoice | null => {
    if (voiceURI) {
      const chosen = voices.find((v) => v.voiceURI === voiceURI)
      if (chosen) return chosen
    }
    // padrão: melhor voz LOCAL em pt-BR, depois pt, depois qualquer local
    return (
      voices.find((v) => v.localService && v.lang.toLowerCase().startsWith('pt-br')) ??
      voices.find((v) => v.lang.toLowerCase().startsWith('pt')) ??
      voices[0] ??
      null
    )
  }

  const speakNext = () => {
    if (stoppedRef.current) return
    const item = queueRef.current[indexRef.current]
    if (!item) {
      stop()
      return
    }
    if (item.first) {
      clearHighlight()
      item.el.classList.add('tts-current')
      currentElRef.current = item.el
      const rect = item.el.getBoundingClientRect()
      if (rect.top < 80 || rect.bottom > window.innerHeight - 40) {
        item.el.scrollIntoView({ block: 'center' })
      }
    }
    /* A voz sai da ESCRITA do trecho, não do documento. Antes daqui o app
       mandava grego para uma voz portuguesa: o motor não produzia som, o
       onerror avançava, e só os números dos versículos saíam falados. */
    const utter = new SpeechSynthesisUtterance(item.text)
    const achada = item.escrita === 'pt-BR' ? null : vozPara(item.escrita, voices)
    const voice = item.escrita === 'pt-BR' ? pickVoice() : achada?.voz ?? null
    if (voice) {
      utter.voice = voice
      utter.lang = voice.lang
      /* Voz aproximada não é voz certa: avisa uma vez, para quem ouve saber
         que aquele latim está saindo com fonética emprestada. */
      if (achada?.aproximada && !avisadosRef.current.has(item.escrita)) {
        avisadosRef.current.add(item.escrita)
        setAviso(
          `Sem voz de ${NOME_DA_ESCRITA[item.escrita]} neste aparelho — lendo com ` +
            `${voice.name}, que é a aproximação mais próxima instalada.`,
        )
      }
    } else {
      /* Sem voz instalada para essa escrita: melhor pular do que ler com a
         fonética errada. Avisa uma vez e segue. */
      if (!avisadosRef.current.has(item.escrita)) {
        avisadosRef.current.add(item.escrita)
        setAviso(`Sem voz de ${NOME_DA_ESCRITA[item.escrita]} neste aparelho — trechos pulados.`)
      }
      indexRef.current++
      speakNext()
      return
    }
    utter.rate = rate
    utter.onend = () => {
      indexRef.current++
      speakNext()
    }
    utter.onerror = () => {
      indexRef.current++
      speakNext()
    }
    speechSynthesis.speak(utter)
  }

  const play = () => {
    if (!bodyRef.current) return
    speechSynthesis.cancel()
    stoppedRef.current = false
    avisadosRef.current.clear()
    setAviso('')
    queueRef.current = collectItems(bodyRef.current, escritaPadrao)
    indexRef.current = 0
    if (!queueRef.current.length) return
    setStatus('speaking')
    speakNext()
  }

  const pause = () => {
    speechSynthesis.pause()
    setStatus('paused')
  }

  const resume = () => {
    speechSynthesis.resume()
    setStatus('speaking')
  }

  if (!supported) return null

  return (
    <div className="tts">
      {open && (
        <div className="tts-panel" role="group" aria-label={t('voz.ouvir')}>
          {aviso && (
            <p className="tts-aviso" role="status">
              {aviso}
            </p>
          )}
          <div className="tts-row">
            {status === 'idle' && (
              <button className="tts-main" onClick={play}>
                ▶ Ouvir
              </button>
            )}
            {status === 'speaking' && (
              <button className="tts-main" onClick={pause}>
                ⏸ Pausar
              </button>
            )}
            {status === 'paused' && (
              <button className="tts-main" onClick={resume}>
                ▶ Retomar
              </button>
            )}
            {status !== 'idle' && (
              <button className="tts-stop" onClick={stop} aria-label={t('voz.parar')}>
                ■ Parar
              </button>
            )}
          </div>
          <label className="tts-field">
            Voz
            <select
              value={voiceURI || pickVoice()?.voiceURI || ''}
              onChange={(e) => setVoiceURI(e.target.value)}
            >
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} — {v.lang}
                  {v.localService ? '' : ' (online)'}
                </option>
              ))}
            </select>
          </label>
          <label className="tts-field">
            Velocidade {rate.toFixed(2).replace('.', ',')}×
            <input
              type="range"
              min={0.5}
              max={1.6}
              step={0.05}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
            />
          </label>
        </div>
      )}
      <button
        className={`tts-fab${status === 'speaking' ? ' tts-fab-active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={t('voz.ouvir')}
        aria-expanded={open}
      >
        🔊
      </button>
    </div>
  )
}
