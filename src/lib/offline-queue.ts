// Cola offline de entregas pendientes de sincronizar con Supabase.
// Usa IndexedDB con keyPath alumno_id:hoja_id — PUT reemplaza si ya existe,
// así el alumno puede editar varias veces offline y solo se sube la última versión.
//
// v2: agrega store 'offline_blocks' para metadatos de bloques descargados para offline.

const DB_NAME = 'librodigital-offline'
const DB_VERSION = 2
const STORE = 'entrega_queue'
const BLOCK_STORE = 'offline_blocks'

export interface PendingEntrega {
  key: string // `${alumno_id}:${hoja_id}`
  alumno_id: string
  hoja_id: string
  contenido: Record<string, unknown>
  estado: 'borrador' | 'entregado'
  fecha_modificacion: string
  fecha_entrega?: string
}

export interface CachedBlockMeta {
  key: string // `${libroId}:${bloqueId}`
  libroId: string
  bloqueId: string
  bloqueTitulo: string
  hojaCount: number
  cachedAt: string
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = req.result
      const old = e.oldVersion
      if (old < 1 && !db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' })
      }
      if (old < 2 && !db.objectStoreNames.contains(BLOCK_STORE)) {
        db.createObjectStore(BLOCK_STORE, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ── Entrega queue ─────────────────────────────────────────────

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

// ── Block cache metadata ──────────────────────────────────────

export async function saveBlockMeta(
  meta: Omit<CachedBlockMeta, 'key'>
): Promise<void> {
  try {
    const db = await openDB()
    const record: CachedBlockMeta = {
      key: `${meta.libroId}:${meta.bloqueId}`,
      ...meta,
    }
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(BLOCK_STORE, 'readwrite')
      tx.objectStore(BLOCK_STORE).put(record)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {}
}

export async function getBlockMeta(
  libroId: string,
  bloqueId: string
): Promise<CachedBlockMeta | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BLOCK_STORE, 'readonly')
      const req = tx.objectStore(BLOCK_STORE).get(`${libroId}:${bloqueId}`)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function removeBlockMeta(
  libroId: string,
  bloqueId: string
): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(BLOCK_STORE, 'readwrite')
      tx.objectStore(BLOCK_STORE).delete(`${libroId}:${bloqueId}`)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {}
}
