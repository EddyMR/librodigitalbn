import { Eye } from 'lucide-react'

/**
 * Aviso para catequistas y administradores que están viendo el libro del
 * alumno. Sin él, lo primero que piensan al no poder escribir es que la app
 * está rota, y llaman.
 */
export default function VistaSoloLectura({ volverA }: { volverA?: string }) {
  return (
    <div className="sticky top-0 z-30 bg-slate-800 text-white px-4 py-2 flex items-center gap-2.5">
      <Eye className="w-4 h-4 flex-shrink-0 text-slate-300" />
      <p className="text-xs leading-tight flex-1">
        <span className="font-semibold">Vista del alumno</span>
        <span className="text-slate-300"> · así lo ve él. Solo lectura: no puedes responder.</span>
      </p>
      {volverA && (
        <a href={volverA} className="text-xs font-semibold text-slate-300 hover:text-white whitespace-nowrap">
          Salir
        </a>
      )}
    </div>
  )
}
