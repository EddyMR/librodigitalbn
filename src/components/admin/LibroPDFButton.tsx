'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

interface Props {
  libroId: string
  titulo: string
  portadaUrl?: string | null
}

interface PageSource {
  url: string | null
  titulo?: string
}

interface PageImage {
  base64: string
  format: 'PNG' | 'JPEG'
  width: number
  height: number
}

// All pages share this width in points (A4 portrait width = 210 mm)
const PT_WIDTH = 595.28

function getPageSpec(img: PageImage | null) {
  if (!img) {
    // A4 portrait fallback
    return { ptW: PT_WIDTH, ptH: 841.89, orientation: 'p' as const }
  }
  const ptH = PT_WIDTH * (img.height / img.width)
  // landscape when width >= height (ptH < PT_WIDTH)
  const orientation: 'l' | 'p' = ptH < PT_WIDTH ? 'l' : 'p'
  return { ptW: PT_WIDTH, ptH, orientation }
}

async function fetchPageImage(url: string): Promise<PageImage | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const format: 'PNG' | 'JPEG' = blob.type.includes('png') ? 'PNG' : 'JPEG'

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

    const { width, height } = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new window.Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => resolve({ width: 800, height: 1200 })
      img.src = dataUrl
    })

    return { base64: dataUrl.split(',')[1], format, width, height }
  } catch {
    return null
  }
}

export default function LibroPDFButton({ libroId, titulo, portadaUrl }: Props) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')

  async function handleDownload() {
    setLoading(true)
    try {
      setProgress('Cargando páginas...')
      const res = await fetch(`/api/admin/libros/${libroId}`)
      const { bloques } = await res.json()

      const hojas: { imagen_url: string | null; titulo?: string }[] = (bloques ?? [])
        .sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0))
        .flatMap((b: any) =>
          ((b.hojas ?? []) as any[])
            .sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0))
        )

      const sources: PageSource[] = []
      if (portadaUrl) sources.push({ url: portadaUrl, titulo: 'Portada' })
      hojas.forEach(h => sources.push({ url: h.imagen_url ?? null, titulo: h.titulo }))

      if (sources.length === 0) {
        setProgress('No hay páginas')
        setTimeout(() => { setLoading(false); setProgress('') }, 2000)
        return
      }

      const pages: (PageImage | null)[] = []
      for (let i = 0; i < sources.length; i++) {
        const s = sources[i]
        const n = portadaUrl ? i : i + 1
        const label = i === 0 && portadaUrl ? 'portada' : `página ${n} de ${hojas.length}`
        setProgress(`Procesando ${label}...`)
        const img = s.url ? await fetchPageImage(s.url) : null
        pages.push(img)
      }

      setProgress('Generando PDF...')
      const { jsPDF } = await import('jspdf')

      // First page — must pass orientation so jsPDF doesn't swap landscape dims
      const first = getPageSpec(pages[0])
      const pdf = new jsPDF({
        unit: 'pt',
        format: [first.ptW, first.ptH],
        orientation: first.orientation,
      })

      const renderPage = (img: PageImage | null, src: PageSource) => {
        const { ptW, ptH } = getPageSpec(img)
        if (img) {
          // Image fills the entire page — ptW × ptH matches the page exactly
          pdf.addImage(img.base64, img.format, 0, 0, ptW, ptH)
        } else {
          pdf.setFillColor(248, 248, 250)
          pdf.rect(0, 0, ptW, ptH, 'F')
          pdf.setTextColor(120, 120, 140)
          pdf.setFontSize(14)
          pdf.text(src.titulo || 'Actividad', ptW / 2, ptH / 2, { align: 'center' })
        }
      }

      renderPage(pages[0], sources[0])

      for (let i = 1; i < pages.length; i++) {
        const spec = getPageSpec(pages[i])
        // Pass orientation so jsPDF never auto-swaps landscape dimensions
        pdf.addPage([spec.ptW, spec.ptH], spec.orientation)
        renderPage(pages[i], sources[i])
      }

      setProgress('Preparando descarga...')
      const safeTitle = titulo.replace(/[^a-z0-9áéíóúüñ\s]/gi, '').trim() || 'libro'
      pdf.save(`${safeTitle}.pdf`)
    } catch (err) {
      console.error(err)
      setProgress('Error al generar PDF')
      setTimeout(() => setProgress(''), 2500)
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 disabled:opacity-60"
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="truncate max-w-[160px]">{progress || 'Generando...'}</span>
        </>
      ) : (
        <>
          <Download className="w-3.5 h-3.5" />
          Descargar PDF
        </>
      )}
    </button>
  )
}
