// Sube a Supabase Storage las imágenes comprimidas, SOBRESCRIBIENDO cada una
// en su misma ruta. Las URLs no cambian → la base de datos no se toca.
//
//   node scripts/subir-imagenes.mjs            → prueba en seco, no sube nada
//   node scripts/subir-imagenes.mjs --una      → sube solo la primera (test)
//   node scripts/subir-imagenes.mjs --confirmar → sube las 157
//
// Para deshacer:  node scripts/restaurar-imagenes.mjs --confirmar
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.join(__dirname, '..')
const COMP = path.join(RAIZ, 'backup_imagenes_comprimidas')

for (const linea of fs.readFileSync(path.join(RAIZ, '.env.local'), 'utf8').split('\n')) {
  const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const plan = JSON.parse(fs.readFileSync(path.join(COMP, '_plan.json'), 'utf8'))
const SOLO_UNA = process.argv.includes('--una')
const CONFIRMAR = process.argv.includes('--confirmar') || SOLO_UNA
const lista = SOLO_UNA ? plan.archivos.slice(0, 1) : plan.archivos

const mb = b => (b / 1024 / 1024).toFixed(1)
console.log(`SUBIR COMPRIMIDAS — ${lista.length} de ${plan.archivos.length} imágenes`)
console.log(`WebP q${plan.calidad}, máx ${plan.ancho_max} px`)
if (!CONFIRMAR) console.log('\nMODO PRUEBA: no se sube nada. Usa --una o --confirmar.\n')

const admin = createClient(URL, KEY, { auth: { persistSession: false } })
let ok = 0, bytesAntes = 0, bytesDespues = 0
const fallos = []
const subidas = []

for (const a of lista) {
  const local = path.join(COMP, a.ruta_bucket)
  if (!fs.existsSync(local)) { fallos.push(`${a.ruta_bucket} → falta el archivo comprimido`); continue }
  const buf = fs.readFileSync(local)
  if (buf.length === 0) { fallos.push(`${a.ruta_bucket} → archivo vacío, NO se sube`); continue }

  const [bucket, ...resto] = a.ruta_bucket.split('/')
  const rutaInterna = resto.join('/')

  bytesAntes += a.bytes_original
  bytesDespues += buf.length

  if (!CONFIRMAR) { ok++; continue }

  const { error } = await admin.storage.from(bucket).upload(rutaInterna, buf, {
    upsert: true,
    contentType: a.formato,      // image/webp — el navegador usa esto, no la extensión
    cacheControl: '3600',
  })
  if (error) { fallos.push(`${a.ruta_bucket} → ${error.message}`); continue }

  ok++
  subidas.push({ ruta: a.ruta_bucket, url: `${URL}/storage/v1/object/public/${a.ruta_bucket}`, bytes: buf.length })
  if (ok % 20 === 0) process.stdout.write(`  ${ok}/${lista.length}\r`)
}

console.log(`\n${CONFIRMAR ? 'subidas' : 'se subirían'}: ${ok}/${lista.length}`)
console.log(`peso: ${mb(bytesAntes)} MB → ${mb(bytesDespues)} MB` +
  (bytesAntes ? `  (${Math.round((1 - bytesDespues / bytesAntes) * 100)}% menos)` : ''))

if (subidas.length) {
  fs.writeFileSync(path.join(COMP, '_subidas.json'), JSON.stringify({ fecha: new Date().toISOString(), subidas }, null, 2))
  console.log('\ncomprobar en el navegador:')
  subidas.slice(0, 2).forEach(s => console.log('  ' + s.url))
}
if (fallos.length) {
  console.log(`\nFALLOS (${fallos.length}):`)
  fallos.forEach(f => console.log('  ' + f))
  process.exitCode = 1
} else if (CONFIRMAR) {
  console.log('\nsin fallos · deshacer con: node scripts/restaurar-imagenes.mjs --confirmar')
}
