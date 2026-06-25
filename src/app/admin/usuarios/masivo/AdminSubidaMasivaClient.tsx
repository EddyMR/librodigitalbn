'use client'

import { useState, useEffect } from 'react'
import { crearAlumnosMasivo } from '@/lib/auth'
import { Download, Users, CheckCircle2, AlertCircle, Loader2, Building2, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui'

interface Props {
  colegios: { id: string; nombre: string; codigo: string }[]
  grupos: { id: string; nombre: string; colegio_id: string }[]
}

interface AlumnoParseado { nombre: string; apellido: string }

interface ResultadoAlumno {
  nombre: string
  apellido: string
  username: string
  password: string
  error?: string
}

function parsearLineas(texto: string): AlumnoParseado[] {
  const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean)
  const resultado: AlumnoParseado[] = []

  for (const linea of lineas) {
    if (linea.includes('\t')) {
      const partes = linea.split('\t').map(p => p.trim()).filter(Boolean)
      if (partes.length >= 2) { resultado.push({ nombre: partes[0], apellido: partes[1] }); continue }
    }
    if (linea.includes(',')) {
      const partes = linea.split(',').map(p => p.trim()).filter(Boolean)
      if (partes.length >= 2) { resultado.push({ nombre: partes[0], apellido: partes[1] }); continue }
    }
    const palabras = linea.split(' ').filter(Boolean)
    if (palabras.length === 0) continue
    resultado.push(palabras.length === 1
      ? { nombre: palabras[0], apellido: '' }
      : { nombre: palabras.slice(0, -1).join(' '), apellido: palabras[palabras.length - 1] }
    )
  }

  return resultado.filter(a => {
    const n = a.nombre.toLowerCase()
    const ap = a.apellido.toLowerCase()
    return !(n === 'nombre' && (ap === 'apellido' || ap === ''))
  })
}

function esc(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function imprimirCredenciales(
  resultados: ResultadoAlumno[],
  colegioNombre: string,
  colegiocodigo: string
) {
  const exitosos = resultados.filter(r => !r.error)
  if (exitosos.length === 0) return

  const loginUrl = `${window.location.origin}/${colegiocodigo}/login`

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Credenciales — ${esc(colegioNombre)}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #0f172a; }
    .no-print { padding: 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: center; }
    .print-btn { padding: 10px 28px; background: #4f46e5; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-family: inherit; font-weight: 600; }
    .print-hint { margin-top: 6px; color: #94a3b8; font-size: 11px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6mm; padding: 4mm 0; }
    .card { border: 1.5px dashed #cbd5e1; border-radius: 4mm; padding: 5mm 6mm; break-inside: avoid; }
    .card-colegio { font-size: 8pt; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5pt; margin-bottom: 2mm; }
    .card-nombre { font-size: 14pt; font-weight: 700; color: #0f172a; margin-bottom: 4mm; line-height: 1.2; }
    .label { font-size: 7pt; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5pt; }
    .value { font-size: 11pt; font-weight: 600; color: #1e293b; font-family: 'Courier New', monospace; }
    .pw-box { background: #f1f5f9; border-radius: 3mm; padding: 3mm 4mm; margin-top: 3mm; }
    .pw-value { font-size: 26pt; font-weight: 900; color: #4f46e5; letter-spacing: 4pt; font-family: 'Courier New', monospace; }
    .card-url { font-size: 7.5pt; color: #94a3b8; margin-top: 3mm; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="print-btn" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
    <p class="print-hint">En el diálogo de impresión puedes elegir "Guardar como PDF" para descargar</p>
  </div>
  <div class="grid">
    ${exitosos.map(r => `
    <div class="card">
      <div class="card-colegio">${esc(colegioNombre)}</div>
      <div class="card-nombre">${esc(r.nombre)} ${esc(r.apellido)}</div>
      <div style="margin-bottom:2mm">
        <div class="label">Usuario</div>
        <div class="value">${esc(r.username)}</div>
      </div>
      <div class="pw-box">
        <div class="label">Contraseña</div>
        <div class="pw-value">${esc(r.password)}</div>
      </div>
      <div class="card-url">${esc(loginUrl)}</div>
    </div>`).join('')}
  </div>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}

function descargarCSV(resultados: ResultadoAlumno[], colegioNombre: string) {
  const filas = [
    ['Nombre', 'Apellido', 'Usuario', 'Contraseña', 'Error'],
    ...resultados.map(r => [r.nombre, r.apellido, r.username, r.password, r.error ?? '']),
  ]
  const csv = filas.map(f => f.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `alumnos_${colegioNombre.replace(/\s+/g, '_')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminSubidaMasivaClient({ colegios, grupos: _grupos }: Props) {
  const [colegioId, setColegioId] = useState('')
  const [grupoId, setGrupoId] = useState('')
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(false)
  const [resultados, setResultados] = useState<ResultadoAlumno[] | null>(null)
  const [confirming, setConfirming] = useState(false)

  // Dynamic grupo loading — avoids stale SSR data when new groups are created
  const [gruposDelColegio, setGruposDelColegio] = useState<{ id: string; nombre: string }[]>([])
  const [loadingGrupos, setLoadingGrupos] = useState(false)

  useEffect(() => {
    if (!colegioId) { setGruposDelColegio([]); setGrupoId(''); return }
    setLoadingGrupos(true)
    setGrupoId('')
    fetch(`/api/admin/grupos?colegio_id=${colegioId}`)
      .then(r => r.json())
      .then(data => setGruposDelColegio(data.grupos ?? []))
      .catch(() => {})
      .finally(() => setLoadingGrupos(false))
  }, [colegioId])

  const alumnos = parsearLineas(texto)

  const colegioSeleccionado = colegios.find(c => c.id === colegioId)
  const grupoSeleccionado = gruposDelColegio.find(g => g.id === grupoId)
  const exitosos = resultados?.filter(r => !r.error).length ?? 0
  const conError = resultados?.filter(r => r.error).length ?? 0

  function handleColegioChange(id: string) {
    setColegioId(id)
  }

  async function handleSubir() {
    if (alumnos.length === 0 || !grupoId || !colegioId) return
    setConfirming(false)
    setCargando(true)
    const { results } = await crearAlumnosMasivo({ alumnos, grupoId, colegioId })
    setResultados(results)
    setCargando(false)
  }

  if (resultados) {
    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <p className="text-sm text-slate-600 font-medium">{colegioSeleccionado?.nombre}</p>
          </div>
          <h2 className="font-bold text-slate-900">Resultado</h2>
          <div className="flex gap-3">
            <div className="flex-1 bg-green-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{exitosos}</p>
              <p className="text-xs text-green-600">Creados</p>
            </div>
            {conError > 0 && (
              <div className="flex-1 bg-red-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-700">{conError}</p>
                <p className="text-xs text-red-600">Errores</p>
              </div>
            )}
          </div>
        </div>

        {/* Credentials table */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="font-semibold text-slate-800 text-sm">{resultados.length} alumnos procesados</p>
            {exitosos > 0 && (
              <button
                onClick={() => descargarCSV(resultados, colegioSeleccionado?.nombre ?? 'colegio')}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Descargar CSV
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
            {resultados.map((r, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{r.nombre} {r.apellido}</p>
                  {r.error ? (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {r.error}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 font-mono">@{r.username}</p>
                  )}
                </div>
                {!r.error && (
                  <span className="font-mono text-sm font-bold text-brand-700 tracking-widest flex-shrink-0">{r.password}</span>
                )}
                {r.error
                  ? <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  : <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                }
              </div>
            ))}
          </div>
        </div>

        {exitosos > 0 && (
          <button
            onClick={() => imprimirCredenciales(resultados, colegioSeleccionado?.nombre ?? '', colegioSeleccionado?.codigo ?? '')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir hoja de credenciales
          </button>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => { setResultados(null); setTexto('') }}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
          >
            Subir más
          </button>
          <a
            href="/admin/usuarios"
            className="flex-1 flex items-center justify-center py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
          >
            Ver usuarios
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Colegio selector */}
      <div className="card p-4 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-400" /> Colegio *
          </label>
          <select
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-all"
            value={colegioId}
            onChange={e => handleColegioChange(e.target.value)}
          >
            <option value="">Seleccionar colegio...</option>
            {colegios.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        {colegioId && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Grupo *</label>
            {loadingGrupos ? (
              <div className="flex items-center gap-2 p-3 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando grupos...
              </div>
            ) : gruposDelColegio.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                Este colegio no tiene grupos activos.
              </div>
            ) : (
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-all"
                value={grupoId}
                onChange={e => setGrupoId(e.target.value)}
              >
                <option value="">Seleccionar grupo...</option>
                {gruposDelColegio.map(g => (
                  <option key={g.id} value={g.id}>{g.nombre}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Format guide */}
      <div className="card p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-600" /> Formato aceptado
        </p>
        <ul className="text-xs text-slate-500 space-y-1">
          <li>• <strong>Excel:</strong> copia dos columnas (Nombre / Apellido) y pégalas aquí</li>
          <li>• <strong>Una por línea:</strong> <code className="font-mono bg-slate-100 px-1 rounded">Juan García</code></li>
          <li>• <strong>CSV:</strong> <code className="font-mono bg-slate-100 px-1 rounded">Juan,García</code></li>
        </ul>
      </div>

      {/* Paste area */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Pega los nombres aquí *</label>
        <textarea
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-all resize-none"
          rows={10}
          placeholder={'Juan García\nMaría López\nCarlos Pérez'}
          value={texto}
          onChange={e => setTexto(e.target.value)}
        />
      </div>

      {/* Preview */}
      {alumnos.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-600">
              {alumnos.length} alumno{alumnos.length !== 1 ? 's' : ''} detectado{alumnos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
            {alumnos.map((a, i) => (
              <div key={i} className="px-4 py-2 flex gap-3 text-sm">
                <span className="text-slate-300 w-5 text-right flex-shrink-0">{i + 1}</span>
                <span className="text-slate-800 font-medium">{a.nombre}</span>
                <span className="text-slate-500">{a.apellido}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setConfirming(true)}
        disabled={cargando || alumnos.length === 0 || !grupoId || !colegioId}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all',
          'bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {cargando ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Creando {alumnos.length} alumnos...</>
        ) : (
          <><Users className="w-4 h-4" /> Revisar y crear {alumnos.length > 0 ? `${alumnos.length} ` : ''}alumno{alumnos.length !== 1 ? 's' : ''}</>
        )}
      </button>

      {confirming && (
        <Modal open onClose={() => setConfirming(false)} title="Confirmar creación" size="md">
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl text-sm space-y-1">
              <p><span className="text-slate-500">Colegio:</span> <span className="font-semibold text-slate-800">{colegioSeleccionado?.nombre}</span></p>
              <p><span className="text-slate-500">Grupo:</span> <span className="font-semibold text-slate-800">{grupoSeleccionado?.nombre}</span></p>
              <p><span className="text-slate-500">Alumnos a crear:</span> <span className="font-bold text-brand-700">{alumnos.length}</span></p>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-600">
                Lista de alumnos
              </div>
              <div className="divide-y divide-slate-50 max-h-56 overflow-y-auto">
                {alumnos.map((a, i) => (
                  <div key={i} className="px-3 py-2 flex gap-3 text-sm">
                    <span className="text-slate-300 w-5 text-right flex-shrink-0 text-xs">{i + 1}</span>
                    <span className="text-slate-800 font-medium">{a.nombre}</span>
                    <span className="text-slate-500">{a.apellido}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Se generarán usuarios y contraseñas automáticamente. Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-2">
              <button onClick={() => setConfirming(false)} className="btn-ghost flex-1">Cancelar</button>
              <button onClick={handleSubir} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Users className="w-4 h-4" /> Confirmar y crear
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
