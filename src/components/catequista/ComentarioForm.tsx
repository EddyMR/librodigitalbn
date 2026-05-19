'use client'

import { useState } from 'react'
import { MessageSquare, Eye, EyeOff, Save, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { formatFechaHora } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Comentario } from '@/types'

interface Props {
  entregaId: string
  catequistaId: string
  comentarioExistente: Comentario | null
}

export default function ComentarioForm({ entregaId, catequistaId, comentarioExistente }: Props) {
  const [editing, setEditing] = useState(!comentarioExistente)
  const [texto, setTexto] = useState(comentarioExistente?.contenido ?? '')
  const [publicado, setPublicado] = useState(comentarioExistente?.publicado ?? false)
  const [saving, setSaving] = useState(false)
  const [comentario, setComentario] = useState(comentarioExistente)
  const supabase = createClient()

  async function handleSave() {
    if (!texto.trim()) return
    setSaving(true)

    if (comentario) {
      // Update
      const { data } = await supabase
        .from('comentarios')
        .update({
          contenido: texto,
          publicado,
          fecha_modificacion: new Date().toISOString(),
        })
        .eq('id', comentario.id)
        .select()
        .single()
      if (data) setComentario(data as Comentario)
    } else {
      // Create
      const { data } = await supabase
        .from('comentarios')
        .insert({
          entrega_id: entregaId,
          catequista_id: catequistaId,
          contenido: texto,
          publicado,
        })
        .select()
        .single()
      if (data) setComentario(data as Comentario)
    }

    setSaving(false)
    setEditing(false)
  }

  async function handleTogglePublish() {
    if (!comentario) return
    const newPublicado = !comentario.publicado
    const { data } = await supabase
      .from('comentarios')
      .update({ publicado: newPublicado, fecha_modificacion: new Date().toISOString() })
      .eq('id', comentario.id)
      .select()
      .single()
    if (data) {
      setComentario(data as Comentario)
      setPublicado(newPublicado)
    }
  }

  return (
    <div className="space-y-2">
      {/* Comment display */}
      {comentario && !editing ? (
        <div className={cn(
          'rounded-xl p-3 border text-sm space-y-2',
          comentario.publicado
            ? 'bg-amber-50 border-amber-200'
            : 'bg-slate-50 border-slate-200'
        )}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-500">Tu comentario</span>
              {comentario.publicado ? (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Publicado</span>
              ) : (
                <span className="text-xs bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">Borrador</span>
              )}
            </div>
            <button onClick={() => setEditing(true)} className="text-slate-400 hover:text-slate-600 p-0.5">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-slate-700">{comentario.contenido}</p>
          {comentario.fecha_comentario && (
            <p className="text-xs text-slate-400">{formatFechaHora(comentario.fecha_comentario)}</p>
          )}
          {/* Publish toggle */}
          <button
            onClick={handleTogglePublish}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors',
              comentario.publicado
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                : 'bg-brand-100 text-brand-700 hover:bg-brand-200'
            )}
          >
            {comentario.publicado ? (
              <><EyeOff className="w-3 h-3" /> Ocultar al alumno</>
            ) : (
              <><Eye className="w-3 h-3" /> Publicar al alumno</>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Escribe tu retroalimentación..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm
                       text-slate-900 placeholder:text-slate-400 resize-none
                       focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <div className="flex items-center gap-2">
            {/* Publish toggle in form */}
            <button
              onClick={() => setPublicado(p => !p)}
              className={cn(
                'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors flex-1 justify-center',
                publicado
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              )}
            >
              {publicado ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {publicado ? 'Se publicará al alumno' : 'Solo visible para ti'}
            </button>

            {comentario && (
              <button onClick={() => setEditing(false)} className="btn-ghost text-xs px-3 py-1.5">
                Cancelar
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !texto.trim()}
              className="btn-primary text-xs px-3 py-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
