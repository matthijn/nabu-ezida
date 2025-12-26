export const filterByQuery = <T,>(
  items: T[],
  query: string,
  toSearchable: (item: T) => string
): T[] =>
  query === ""
    ? items
    : items.filter((item) =>
        toSearchable(item).toLowerCase().includes(query.toLowerCase())
      )
