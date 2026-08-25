'use client'

const avenir = "Avenir, 'Avenir Next', system-ui, sans-serif"

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronDown, Search } from 'lucide-react'
import type { Colegio } from '@/types'

interface Props {
  colegios: Colegio[]
}

export default function ColegioSelector({ colegios }: Props) {
  const [selected, setSelected] = useState<Colegio | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return colegios
    const q = query.toLowerCase()
    return colegios.filter(c =>
      c.nombre.toLowerCase().includes(q) || c.codigo.toLowerCase().includes(q)
    )
  }, [query, colegios])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60)
  }, [open])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(colegio: Colegio) {
    setSelected(colegio)
    setOpen(false)
    setQuery('')
  }

  function handleContinue() {
    if (!selected) return
    router.push(`/${selected.codigo}/login`)
  }

  return (
    <div className="space-y-3" ref={dropdownRef}>
      {/* ── Selector button ── */}
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-opacity active:opacity-80"
          style={{ backgroundColor: '#1c3e70', fontFamily: avenir }}
        >
          <span
            className="text-sm truncate pr-3"
            style={{ color: selected ? '#fff' : 'rgba(255,255,255,0.55)', fontFamily: avenir }}
          >
            {selected ? selected.nombre : 'Selecciona tu Colegio'}
          </span>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#ef8532' }}
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </div>
        </button>

        {/* ── Dropdown panel ── */}
        {open && (
          <div
            className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl overflow-hidden z-20 shadow-2xl"
            style={{ backgroundColor: '#1c3e70' }}
          >
            {/* Search input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar colegio..."
                className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 outline-none"
              />
            </div>

            {/* List */}
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-4 py-4 text-sm text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  No se encontraron colegios
                </p>
              ) : (
                filtered.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    className="w-full text-left px-5 py-3.5 text-sm transition-colors border-t border-white/10 first:border-0"
                    style={{ color: 'rgba(255,255,255,0.85)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                  >
                    {c.nombre}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Separator ── */}
      <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)' }} />

      {/* ── Continuar button ── */}
      <button
        onClick={handleContinue}
        disabled={!selected}
        className="w-full py-4 rounded-2xl text-white font-bold text-base tracking-wide transition-opacity"
        style={{
          backgroundColor: '#ef8532',
          opacity: selected ? 1 : 0.45,
          cursor: selected ? 'pointer' : 'not-allowed',
          fontFamily: avenir,
        }}
      >
        continuar
      </button>
    </div>
  )
}
