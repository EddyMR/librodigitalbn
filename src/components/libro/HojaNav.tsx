'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'

interface HojaBasica { id: string }

interface Props {
  codigo: string
  libroId: string
  bloqueId: string
  bloqueTitle: string
  bloqueIndex: number
  totalBloques: number
  hojaIndex: number
  totalHojas: number
  prevHojaId?: string
  nextHojaId?: string
  hojas: HojaBasica[]
}

export default function HojaNav({
  codigo, libroId, bloqueId, bloqueTitle, bloqueIndex, totalBloques,
  hojaIndex, totalHojas, prevHojaId, nextHojaId, hojas,
}: Props) {
  const router = useRouter()
  const [jumping, setJumping] = useState(false)
  const [jumpValue, setJumpValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function goTo(index: number) {
    const target = hojas[index]
    if (target && index !== hojaIndex) {
      router.push(`/${codigo}/libros/${libroId}/${bloqueId}/${target.id}`)
    }
  }

  function openJump() {
    setJumpValue(String(hojaIndex + 1))
    setJumping(true)
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 30)
  }

  function handleJump() {
    const n = parseInt(jumpValue, 10)
    if (!isNaN(n) && n >= 1 && n <= totalHojas) goTo(n - 1)
    setJumping(false)
  }

  return (
    <div className="sticky top-0 z-20">
      {/* ── Main nav row ───────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-2 py-2 bg-slate-900">

        {/* Back */}
        <button
          onClick={() => router.push(`/${codigo}/libros/${libroId}`)}
          className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          aria-label="Volver al libro"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Center: title + progress */}
        <div className="flex-1 text-center px-1 min-w-0">
          {bloqueIndex >= 0 && totalBloques > 0 && (
            <p className="text-brand-400 text-[10px] font-semibold uppercase tracking-wide leading-none">
              Bloque {bloqueIndex + 1} de {totalBloques}
            </p>
          )}
          <p className="text-white text-xs font-medium truncate leading-tight mt-0.5">{bloqueTitle}</p>
          <div className="flex items-center justify-center gap-1 mt-1.5 flex-wrap">

            {/* Clickable dots — shown when ≤ 12 pages */}
            {totalHojas <= 12 && hojas.map((h, i) => (
              <button
                key={h.id}
                onClick={() => goTo(i)}
                aria-label={`Ir a página ${i + 1}`}
                className={`rounded-full transition-all ${
                  i === hojaIndex
                    ? 'w-3 h-1.5 bg-white'
                    : i < hojaIndex
                    ? 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                    : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/50'
                }`}
              />
            ))}

            {/* Tappable counter → opens jump panel */}
            <button
              onClick={jumping ? () => setJumping(false) : openJump}
              className="text-white/40 hover:text-white/80 text-[10px] ml-0.5 tabular-nums px-1 py-0.5 rounded hover:bg-white/10 transition-colors"
            >
              {hojaIndex + 1}/{totalHojas}
            </button>
          </div>
        </div>

        {/* Prev / Next */}
        <div className="flex gap-0.5 flex-shrink-0">
          <button
            disabled={!prevHojaId}
            onClick={() => prevHojaId && router.push(`/${codigo}/libros/${libroId}/${bloqueId}/${prevHojaId}`)}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20"
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            disabled={!nextHojaId}
            onClick={() => nextHojaId && router.push(`/${codigo}/libros/${libroId}/${bloqueId}/${nextHojaId}`)}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20"
            aria-label="Página siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Quick jump panel ──────────────────────────────────── */}
      {jumping && (
        <div className="bg-slate-800 border-t border-white/10 px-4 py-2.5 flex items-center gap-3">
          <span className="text-slate-400 text-xs whitespace-nowrap">Ir a página:</span>
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            min={1}
            max={totalHojas}
            value={jumpValue}
            onChange={e => setJumpValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleJump()
              if (e.key === 'Escape') setJumping(false)
            }}
            className="w-14 text-center bg-slate-700 text-white text-sm rounded-lg px-2 py-1.5
                       border border-white/20 focus:outline-none focus:border-brand-400
                       [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                       [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-slate-500 text-xs">de {totalHojas}</span>
          <button
            onClick={handleJump}
            className="ml-auto px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-colors"
          >
            Ir
          </button>
          <button
            onClick={() => setJumping(false)}
            className="text-slate-400 hover:text-white transition-colors text-sm leading-none"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
