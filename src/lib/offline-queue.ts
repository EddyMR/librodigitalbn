// Cola offline de entregas pendientes de sincronizar con Supabase.
// Usa IndexedDB con keyPath alumno_id:hoja_id — PUT reemplaza si ya existe,
// así el alumno puede editar varias veces offline y solo se sube la última versión.

const DB_NAME = 'librodigital-offline'
const DB_VERSION = 1
const STORE = 'entrega_queue'

export interface PendingEntrega {
  key: string // `${alumno_id}:${hoja_id}`
  alumno_id: string
  hoja_id: string
  contenido: Record<string, unknown>
  estado: 'borrador' | 'entregado'
  fecha_modificacion: string
  fecha_entrega?: string
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function enqueueEntrega(
  entry: Omit<PendingEntrega, 'key'>
): Promise<void> {
  try {
    const db = await openDB()
    const record: PendingEntrega = {
      key: `${entry.alumno_id}:${entry.hoja_id}`,
      ...entry,
    }
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(record)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // IndexedDB puede no estar disponible en navegación privada (Firefox)
  }
}

export async function getPendingEntregas(): Promise<PendingEntrega[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).getAll()
      req.onsuccess = () => resolve(req.result ?? [])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export async function removeEntrega(key: string): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {}
}

export async function countPending(): Promise<number> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).count()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return 0
  }
}
