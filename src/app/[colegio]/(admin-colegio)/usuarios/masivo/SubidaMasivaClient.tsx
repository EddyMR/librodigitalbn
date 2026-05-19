'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { crearAlumnosMasivo } from '@/lib/auth'
import { Download, Users, CheckCircle2, AlertCircle, Loader2, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  grupos: { id: string; nombre: string }[]
  colegioId: string
  codigoColegio: string
  colegioNombre: string
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

function descargarCSV(resultados: ResultadoAlumno[]) {
  const filas = [
    ['Nombre', 'Apellido', 'Usuario', 'Contraseña', 'Error'],
    ...resultados.map(r => [r.nombre, r.apellido, r.username, r.password, r.error ?? '']),
  ]
  const csv = filas.map(f => f.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'alumnos_credenciales.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function esc(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function imprimirCredenciales(
  resultados: ResultadoAlumno[],
  colegioNombre: string,
  codigoColegio: string
) {
  const exitosos = resultados.filter(r => !r.error)
  if (exitosos.length === 0) return

  const loginUrl = `${window.location.origin}/${codigoColegio}/login`

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

export default function SubidaMasivaClient({ grupos, colegioId, codigoColegio, colegioNombre }: Props) {
  const [texto, setTexto] = useState('')
  const [grupoId, setGrupoId] = useState(grupos[0]?.id ?? '')
  const [cargando, setCargando] = useState(false)
  const [resultados, setResultados] = useState<ResultadoAlumno[] | null>(null)
  const router = useRouter()

  const alumnos = useMemo(() => parsearLineas(texto), [texto])

  const exitosos = resultados?.filter(r => !r.error).length ?? 0
  const conError = resultados?.filter(r => r.error).length ?? 0

  async function handleSubir() {
    if (alumnos.length === 0 || !grupoId) return
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
              <button onClick={() => descargarCSV(resultados)} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
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

        {/* Print sheet */}
        {exitosos > 0 && (
          <button
            onClick={() => imprimirCredenciales(resultados, colegioNombre, codigoColegio)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir hoja de credenciales
          </button>
        )}

        <div className="flex gap-2">
          <button onClick={() => { setResultados(null); setTexto('') }} className="btn-secondary flex-1">
            Subir más
          </button>
          <button onClick={() => router.push(`/${codigoColegio}/usuarios`)} className="btn-primary flex-1">
            Ver usuarios
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Instructions */}
      <div className="card p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-600" />
          Formato aceptado
        </p>
        <ul className="text-xs text-slate-500 space-y-1">
          <li>• <strong>Excel:</strong> copia dos columnas (Nombre / Apellido) y pégalas aquí</li>
          <li>• <strong>Una por línea:</strong> <code className="font-mono bg-slate-100 px-1 rounded">Juan García</code></li>
          <li>• <strong>CSV:</strong> <code className="font-mono bg-slate-100 px-1 rounded">Juan,García</code></li>
        </ul>
      </div>

      {/* Group selector */}
      {grupos.length === 0 ? (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          No hay grupos activos. Crea un grupo primero.
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Grupo *</label>
          <select className="input" value={grupoId} onChange={e => setGrupoId(e.target.value)}>
            {grupos.map(g => (
              <option key={g.id} value={g.id}>{g.nombre}</option>
            ))}
          </select>
        </div>
      )}

      {/* Paste area */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Pega los nombres aquí *</label>
        <textarea
          className="input resize-none font-mono text-sm"
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
            <p className="text-xs font-semibold text-slate-600">{alumnos.length} alumno{alumnos.length !== 1 ? 's' : ''} detectado{alumnos.length !== 1 ? 's' : ''}</p>
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
        onClick={handleSubir}
        disabled={cargando || alumnos.length === 0 || !grupoId}
        className="btn-primary w-full"
      >
        {cargando ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Creando {alumnos.length} alumnos...</>
        ) : (
          <><Users className="w-4 h-4" /> Crear {alumnos.length > 0 ? `${alumnos.length} ` : ''}alumno{alumnos.length !== 1 ? 's' : ''}</>
        )}
      </button>
    </div>
  )
}
