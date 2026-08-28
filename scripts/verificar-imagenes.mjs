// Comprueba contra Supabase que las 157 imágenes están servidas como WebP,
// que decodifican y que ninguna supera el ancho máximo. Solo lectura.
//   node scripts/verificar-imagenes.mjs
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.join(__dirname, '..')

for (const linea of fs.readFileSync(path.join(RAIZ, '.env.local'), 'utf8').split('\n')) {
  const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
}
const URL_BASE = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '')
if (!URL_BASE) { console.error('Falta NEXT_PUBLIC_SUPABASE_URL'); process.exit(1) }

const plan = JSON.parse(fs.readFileSync(path.join(RAIZ, 'backup_imagenes_comprimidas', '_plan.json'), 'utf8'))

let ok = 0, bytes = 0, anchoMax = 0
const problemas = []

for (const a of plan.archivos) {
  const u = `${URL_BASE}/storage/v1/object/public/${a.ruta_bucket}`
  try {
    const r = await fetch(u)
    if (!r.ok) { problemas.push(`${a.ruta_bucket} → HTTP ${r.status}`); continue }
    const ct = r.headers.get('content-type')
    const buf = Buffer.from(await r.arrayBuffer())
    const meta = await sharp(buf).metadata()
    await sharp(buf).raw().toBuffer()          // decodifica de verdad

    if (meta.format !== 'webp') problemas.push(`${a.ruta_bucket} → sigue en ${meta.format}`)
    if (ct !== 'image/webp') problemas.push(`${a.ruta_bucket} → content-type ${ct}`)
    if (meta.width > plan.ancho_max) problemas.push(`${a.ruta_bucket} → ancho ${meta.width}`)
    if (buf.length !== a.bytes_nuevo) problemas.push(`${a.ruta_bucket} → ${buf.length} B, esperaba ${a.bytes_nuevo}`)

    if (meta.width > anchoMax) anchoMax = meta.width
    bytes += buf.length
    ok++
  } catch (e) {
    problemas.push(`${a.ruta_bucket} → ${e.message}`)
  }
  if (ok % 25 === 0) process.stdout.write(`  ${ok}/${plan.archivos.length}\r`)
}

console.log(`\nverificadas: ${ok}/${plan.archivos.length}`)
console.log(`peso ahora en Supabase: ${(bytes / 1024 / 1024).toFixed(1)} MB  (antes ${(plan.bytes_original / 1024 / 1024).toFixed(1)} MB)`)
console.log(`ancho máximo: ${anchoMax} px`)
if (problemas.length) {
  console.log(`\nPROBLEMAS (${problemas.length}):`)
  problemas.slice(0, 15).forEach(p => console.log('  ' + p))
  process.exitCode = 1
} else {
  console.log('\nsin problemas · las 157 están servidas como WebP y decodifican')
}
