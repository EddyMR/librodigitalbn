// Backup script — exports all table data to JSON using service role key
// Run: node scripts/backup.mjs
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Las credenciales salen de .env.local, nunca escritas aquí: este archivo
// acabaría en el bundle de despliegue y la service_role key se salta todo el RLS.
for (const line of readFileSync(join(__dirname, '..', '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

const TABLES = [
  'colegios',
  'perfiles',
  'grupos',
  'grupo_alumnos',
  'ciclos',
  'libros',
  'libro_grupos',
  'bloques',
  'hojas',
  'zonas_escritura',
  'entregas',
  'comentarios',
  'visitas_hojas',
  'qr_tokens',
]

async function exportTable(table) {
  let allRows = []
  let from = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await admin
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1)

    if (error) {
      console.warn(`  ⚠ ${table}: ${error.message}`)
      break
    }
    if (!data || data.length === 0) break
    allRows = allRows.concat(data)
    if (data.length < pageSize) break
    from += pageSize
  }

  return allRows
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outDir = join(__dirname, '..', `backup_${timestamp}`)
  mkdirSync(outDir, { recursive: true })

  const summary = {}

  for (const table of TABLES) {
    process.stdout.write(`Exportando ${table}... `)
    const rows = await exportTable(table)
    const outPath = join(outDir, `${table}.json`)
    writeFileSync(outPath, JSON.stringify(rows, null, 2), 'utf8')
    summary[table] = rows.length
    console.log(`${rows.length} filas`)
  }

  // Write summary
  const summaryPath = join(outDir, '_summary.json')
  writeFileSync(summaryPath, JSON.stringify({
    fecha: new Date().toISOString(),
    proyecto: SUPABASE_URL,
    tablas: summary,
    total_filas: Object.values(summary).reduce((a, b) => a + b, 0),
  }, null, 2), 'utf8')

  console.log(`\n✓ Respaldo completado en: backup_${timestamp}/`)
  console.log(`  Total: ${Object.values(summary).reduce((a, b) => a + b, 0)} filas en ${TABLES.length} tablas`)
}

main().catch(err => { console.error('Error:', err); process.exit(1) })
