// Mide cuánta calidad perdió cada página al comprimirse, comparando la
// comprimida contra su original del respaldo. Solo local, no toca nada.
//   node scripts/calidad-imagenes.mjs
//
// PSNR en dB: cuanto más alto, más fiel. Por encima de 40 dB la diferencia
// es indistinguible a simple vista; por debajo de 32 conviene mirarla.
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.join(__dirname, '..')
const ORIG = path.join(RAIZ, 'backup_imagenes_originales')
const COMP = path.join(RAIZ, 'backup_imagenes_comprimidas')

const plan = JSON.parse(fs.readFileSync(path.join(COMP, '_plan.json'), 'utf8'))
const hojas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'backup_2026-08-25T01-10-19', 'hojas.json'), 'utf8'))
const bloques = JSON.parse(fs.readFileSync(path.join(RAIZ, 'backup_2026-08-25T01-10-19', 'bloques.json'), 'utf8'))
const libros = JSON.parse(fs.readFileSync(path.join(RAIZ, 'backup_2026-08-25T01-10-19', 'libros.json'), 'utf8'))

const resultados = []

for (const a of plan.archivos) {
  const fo = path.join(ORIG, a.ruta_bucket)
  const fc = path.join(COMP, a.ruta_bucket)
  const meta = await sharp(fo).metadata()

  // Se comparan AMBAS al tamaño en que el móvil las muestra. Comparar contra
  // el original a resolución completa mediría la resolución que se quitó a
  // propósito —y que el móvil nunca iba a mostrar—, no la pérdida real.
  const anchoVista = Math.min(plan.ancho_max, meta.width)
  const alturaVista = Math.round(meta.height * anchoVista / meta.width)
  const aVista = s => s.resize({ width: anchoVista, height: alturaVista, fit: 'fill' }).greyscale().raw().toBuffer()
  const [orig, comp] = await Promise.all([aVista(sharp(fo)), aVista(sharp(fc))])

  let suma = 0
  const n = Math.min(orig.length, comp.length)
  for (let i = 0; i < n; i++) { const d = orig[i] - comp[i]; suma += d * d }
  const mse = suma / n
  const psnr = mse === 0 ? 99 : 10 * Math.log10((255 * 255) / mse)

  const hoja = hojas.find(h => h.imagen_url && decodeURIComponent(h.imagen_url).endsWith(a.ruta_bucket))
  const bloque = hoja && bloques.find(b => b.id === hoja.bloque_id)
  const libro = bloque && libros.find(l => l.id === bloque.libro_id)

  resultados.push({
    psnr,
    ruta: a.ruta_bucket,
    libro: libro ? libro.titulo : '?',
    bloque: bloque ? bloque.titulo : '?',
    hoja: hoja ? (hoja.titulo || 'sin título') : '?',
    kbAntes: Math.round(a.bytes_original / 1024),
    kbAhora: Math.round(a.bytes_nuevo / 1024),
    redimensionada: a.ancho_nuevo < a.ancho_original,
  })
  if (resultados.length % 25 === 0) process.stdout.write(`  ${resultados.length}/${plan.archivos.length}\r`)
}

resultados.sort((x, y) => x.psnr - y.psnr)
const media = resultados.reduce((s, r) => s + r.psnr, 0) / resultados.length
const bajo40 = resultados.filter(r => r.psnr < 40).length
const bajo32 = resultados.filter(r => r.psnr < 32).length

console.log(`\nanalizadas: ${resultados.length}`)
console.log(`fidelidad media: ${media.toFixed(1)} dB`)
console.log(`por debajo de 40 dB (diferencia perceptible con lupa): ${bajo40}`)
console.log(`por debajo de 32 dB (conviene mirarla): ${bajo32}`)

console.log(`\n── las 5 que peor salieron ──`)
resultados.slice(0, 5).forEach((r, i) => {
  console.log(`${i + 1}. ${r.psnr.toFixed(1)} dB  ${r.libro}`)
  console.log(`   ${r.bloque} · «${r.hoja}»`)
  console.log(`   ${r.kbAntes} → ${r.kbAhora} KB${r.redimensionada ? ' · redimensionada' : ''}`)
})

console.log(`\n── las 3 que mejor salieron ──`)
resultados.slice(-3).reverse().forEach(r => console.log(`   ${r.psnr.toFixed(1)} dB  «${r.hoja}»`))

fs.writeFileSync(path.join(COMP, '_calidad.json'), JSON.stringify({ media, resultados }, null, 2))
