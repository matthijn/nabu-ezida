import { fnvHash } from "./hash"

const STORE_NAME = "kv"
const DB_VERSION = 1

const openDb = (name: string): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const dbCache = new Map<string, Promise<IDBDatabase>>()

const getDb = (prefix: string): Promise<IDBDatabase> => {
  const dbName = `cache:${prefix}`
  const existing = dbCache.get(dbName)
  if (existing) return existing
  const promise = openDb(dbName)
  dbCache.set(dbName, promise)
  return promise
}

const idbGet = <T>(db: IDBDatabase, key: string): Promise<T | undefined> =>
  new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const request = tx.objectStore(STORE_NAME).get(key)
    request.onsuccess = () => resolve(request.result as T | undefined)
    request.onerror = () => reject(request.error)
  })

const idbPut = <T>(db: IDBDatabase, key: string, value: T): Promise<void> =>
  new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const request = tx.objectStore(STORE_NAME).put(value, key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })

const buildKey = (args: string[]): string => fnvHash(args.join("\0"))

const tryGet = async <T>(prefix: string, key: string): Promise<T | undefined> => {
  try {
    const db = await getDb(prefix)
    return await idbGet<T>(db, key)
  } catch (e) {
    console.debug("[CACHE] get failed for", prefix, e)
    return undefined
  }
}

const tryPut = async <T>(prefix: string, key: string, value: T): Promise<void> => {
  try {
    const db = await getDb(prefix)
    await idbPut(db, key, value)
  } catch (e) {
    console.debug("[CACHE] put failed for", prefix, e)
  }
}

export const cacheInStorage =
  <Args extends string[], T>(
    prefix: string,
    fn: (...args: Args) => Promise<T>
  ): ((...args: Args) => Promise<T>) =>
  async (...args: Args): Promise<T> => {
    const key = buildKey(args)
    const cached = await tryGet<T>(prefix, key)
    if (cached !== undefined) return cached

    const result = await fn(...args)
    await tryPut(prefix, key, result)
    return result
  }
