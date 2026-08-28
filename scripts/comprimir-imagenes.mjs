// Comprime las imágenes del respaldo. SOLO LOCAL: no toca Supabase ni la red.
//   node scripts/comprimir-imagenes.mjs
// Lee  backup_imagenes_originales/  y escribe  backup_imagenes_comprimidas/
// El respaldo original NO se modifica nunca.
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.join(__dirname, '..')
const ORIG = path.join(RAIZ, 'backup_imagenes_originales')
const DEST = path.join(RAIZ, 'backup_imagenes_comprimidas')

const ANCHO_MAX = 1400      // el móvil muestra ~1290 px reales
const CALIDAD = 80          // WebP q80: la calidad aprobada en la comparación

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])
}

const indice = JSON.parse(fs.readFileSync(path.join(ORIG, '_indice.json'), 'utf8'))
const files = walk(ORIG).filter(f => !f.endsWith('.json'))

console.log(`comprimiendo ${files.length} imágenes → WebP q${CALIDAD}, máx ${ANCHO_MAX} px\n`)

let sumaOrig = 0, sumaNueva = 0, hechas = 0
const fallos = []
const salida = []

for (const f of files) {
  const rel = path.relative(ORIG, f).split(path.sep).join('/')
  try {
    const meta = await sharp(f).metadata()
    let pipe = sharp(f)
    if (meta.width > ANCHO_MAX) pipe = pipe.resize({ width: ANCHO_MAX, withoutEnlargement: true })
    const buf = await pipe.webp({ quality: CALIDAD }).toBuffer()

    // Nunca subir algo más pesado que el original: en ese caso se deja tal cual
    const original = fs.readFileSync(f)
    const usarNuevo = buf.length < original.length
    const destino = path.join(DEST, rel)
    fs.mkdirSync(path.dirname(destino), { recursive: true })
    fs.writeFileSync(destino, usarNuevo ? buf : original)

    const entrada = indice.archivos.find(a => a.ruta_bucket === rel)
    salida.push({
      ruta_bucket: rel,
      hoja_id: entrada ? entrada.hoja_id : null,
      bytes_original: original.length,
      bytes_nuevo: usarNuevo ? buf.length : original.length,
      formato: usarNuevo ? 'image/webp' : (meta.format === 'png' ? 'image/png' : 'image/jpeg'),
      recomprimida: usarNuevo,
      ancho_original: meta.width,
      ancho_nuevo: usarNuevo && meta.width > ANCHO_MAX ? ANCHO_MAX : meta.width,
    })

    sumaOrig += original.length
    sumaNueva += usarNuevo ? buf.length : original.length
    hechas++
  } catch (e) {
    fallos.push(`${rel} → ${e.message}`)
  }
  if (hechas % 25 === 0) process.stdout.write(`  ${hechas}/${files.length}\r`)
}

fs.writeFileSync(path.join(DEST, '_plan.json'), JSON.stringify({
  fecha: new Date().toISOString(),
  ancho_max: ANCHO_MAX,
  calidad: CALIDAD,
  total: salida.length,
  bytes_original: sumaOrig,
  bytes_nuevo: sumaNueva,
  archivos: salida,
}, null, 2))

const mb = b => (b / 1024 / 1024).toFixed(1)
console.log(`\n\ncomprimidas:  ${hechas}/${files.length}`)
console.log(`sin recomprimir (ya eran menores): ${salida.filter(s => !s.recomprimida).length}`)
console.log(`redimensionadas: ${salida.filter(s => s.ancho_nuevo < s.ancho_original).length}`)
console.log(`\npeso:  ${mb(sumaOrig)} MB  →  ${mb(sumaNueva)} MB   (${Math.round((1 - sumaNueva / sumaOrig) * 100)}% menos)`)
if (fallos.length) {
  console.log(`\nFALLOS (${fallos.length}):`)
  fallos.forEach(f => console.log('  ' + f))
  process.exitCode = 1
} else {
  console.log('\nsin fallos · el respaldo original sigue intacto')
}
