// ─────────────────────────────────────────────────────────────────────
//  VÍA DE VUELTA
//  Devuelve a Supabase Storage las imágenes ORIGINALES sin comprimir.
//
//      node scripts/restaurar-imagenes.mjs --confirmar
//
//  Sube cada archivo de backup_imagenes_originales/ a su misma ruta en el
//  bucket, con su tipo original. Las URLs no cambian, así que la base de
//  datos no se toca: las filas de `hojas` siguen siendo válidas.
//
//  Sin --confirmar solo enseña lo que haría, no sube nada.
// ─────────────────────────────────────────────────────────────────────
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.join(__dirname, '..')
const ORIG = path.join(RAIZ, 'backup_imagenes_originales')

// Credenciales desde .env.local — nunca escritas en este archivo
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

const indice = JSON.parse(fs.readFileSync(path.join(ORIG, '_indice.json'), 'utf8'))
const CONFIRMAR = process.argv.includes('--confirmar')

const tipoPorExtension = f =>
  f.endsWith('.png') ? 'image/png' : f.endsWith('.webp') ? 'image/webp' : 'image/jpeg'

console.log(`RESTAURAR ORIGINALES — ${indice.archivos.length} imágenes`)
console.log(`respaldo: ${ORIG}`)
if (!CONFIRMAR) {
  console.log('\nMODO PRUEBA: no se sube nada. Añade --confirmar para restaurar de verdad.\n')
}

const admin = createClient(URL, KEY, { auth: { persistSession: false } })
let ok = 0, bytes = 0
const fallos = []

for (const a of indice.archivos) {
  const local = path.join(ORIG, a.ruta_bucket)
  if (!fs.existsSync(local)) { fallos.push(`${a.ruta_bucket} → no está en el respaldo`); continue }
  const buf = fs.readFileSync(local)
  const [bucket, ...resto] = a.ruta_bucket.split('/')
  const rutaInterna = resto.join('/')

  if (!CONFIRMAR) { ok++; bytes += buf.length; continue }

  const { error } = await admin.storage.from(bucket)
    .upload(rutaInterna, buf, { upsert: true, contentType: tipoPorExtension(local), cacheControl: '3600' })
  if (error) fallos.push(`${a.ruta_bucket} → ${error.message}`)
  else { ok++; bytes += buf.length }
  if (ok % 25 === 0) process.stdout.write(`  ${ok}/${indice.archivos.length}\r`)
}

console.log(`\n${CONFIRMAR ? 'restauradas' : 'se restaurarían'}: ${ok}/${indice.archivos.length}  (${(bytes / 1024 / 1024).toFixed(1)} MB)`)
if (fallos.length) {
  console.log(`\nFALLOS (${fallos.length}):`)
  fallos.forEach(f => console.log('  ' + f))
  process.exitCode = 1
} else if (CONFIRMAR) {
  console.log('\nListo. Las URLs no han cambiado, así que la app ya sirve las originales.')
  console.log('Los alumnos con la versión comprimida en caché la conservarán hasta 30 días.')
}
