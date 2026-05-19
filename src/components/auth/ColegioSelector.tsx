'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronRight, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Colegio } from '@/types'

interface Props {
  colegios: Colegio[]
}

export default function ColegioSelector({ colegios }: Props) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Colegio | null>(null)
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const filtered = useMemo(() => {
    if (!query) return colegios.slice(0, 8)
    const q = query.toLowerCase()
    return colegios.filter(c =>
      c.nombre.toLowerCase().includes(q) || c.codigo.toLowerCase().includes(q)
    ).slice(0, 8)
  }, [query, colegios])

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
    <div className="space-y-4">
      {/* Selected display or search */}
      {selected ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-brand-50 border border-brand-200">
          <div className="w-10 h-10 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-brand-900 text-sm truncate">{selected.nombre}</p>
            <p className="text-brand-500 text-xs">Código: {selected.codigo}</p>
          </div>
          <button
            onClick={() => setSelected(null)}
            className="text-brand-400 hover:text-brand-600 p-1"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Buscar colegio..."
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            autoComplete="off"
          />
        </div>
      )}

      {/* Dropdown list */}
      {open && !selected && (
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-card bg-white divide-y divide-slate-50">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-slate-400 text-sm">
              No se encontraron colegios
            </div>
          ) : (
            filtered.map(colegio => (
              <button
                key={colegio.id}
                onClick={() => handleSelect(colegio)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{colegio.nombre}</p>
                  <p className="text-xs text-slate-400">{colegio.codigo}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      )}

      {/* Continue button */}
      <button
        onClick={handleContinue}
        disabled={!selected}
        className={cn(
          'btn-primary w-full',
          !selected && 'opacity-50 cursor-not-allowed'
        )}
      >
        Continuar
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
