'use client'

import { useState } from 'react'
import { QrCode, Download, RefreshCw } from 'lucide-react'
import { generarQRToken } from '@/lib/auth'
import QRCode from 'qrcode'

interface Props {
  alumnoId: string
  alumnoNombre: string
  codigoColegio: string
}

export default function QRGenerador({ alumnoId, alumnoNombre, codigoColegio }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleGenerar() {
    setLoading(true)
    const result = await generarQRToken(alumnoId)
    if (result.token && result.url) {
      const dataUrl = await QRCode.toDataURL(result.url, {
        width: 300,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
      })
      setQrDataUrl(dataUrl)
    }
    setLoading(false)
  }

  function handleDownload() {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `qr-${alumnoNombre.replace(/\s+/g, '-').toLowerCase()}.png`
    a.click()
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => { setOpen(p => !p); if (!open && !qrDataUrl) handleGenerar() }}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <QrCode className="w-5 h-5 text-brand-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-700">Código QR para iniciar sesión</p>
          <p className="text-xs text-slate-400">Genera un QR que el alumno puede escanear</p>
        </div>
        <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
      </button>

      {open && (
        <div className="p-4 space-y-3 border-t border-slate-100 animate-slide-up">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 rounded-full border-2 border-brand-300 border-t-brand-600 animate-spin" />
            </div>
          ) : qrDataUrl ? (
            <div className="text-center space-y-3">
              <div className="inline-block p-3 bg-white border border-slate-200 rounded-2xl shadow-card">
                <img src={qrDataUrl} alt="QR de acceso" className="w-48 h-48" />
              </div>
              <p className="text-xs text-slate-500">
                Este QR es válido por 1 hora. El alumno puede escanearlo para entrar directamente.
              </p>
              <div className="flex gap-2">
                <button onClick={handleGenerar} className="btn-ghost flex-1 text-sm">
                  <RefreshCw className="w-4 h-4" /> Regenerar
                </button>
                <button onClick={handleDownload} className="btn-secondary flex-1 text-sm">
                  <Download className="w-4 h-4" /> Descargar
                </button>
              </div>
            </div>
          ) : (
            <button onClick={handleGenerar} className="btn-primary w-full">
              Generar QR
            </button>
          )}
        </div>
      )}
    </div>
  )
}
