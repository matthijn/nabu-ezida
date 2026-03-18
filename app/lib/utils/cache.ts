interface CappedCache<K, V> {
  get: (key: K) => V | undefined
  has: (key: K) => boolean
  set: (key: K, value: V) => void
}

export const createCappedCache = <K, V>(max: number): CappedCache<K, V> => {
  const map = new Map<K, V>()
  return {
    get: (key) => map.get(key),
    has: (key) => map.has(key),
    set: (key, value) => {
      if (map.size >= max && !map.has(key)) {
        const firstKey = map.keys().next().value
        if (firstKey !== undefined) map.delete(firstKey)
      }
      map.set(key, value)
    },
  }
}
