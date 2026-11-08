// PostgREST returns a many-to-one embed as a single object, while supabase-js
// types can describe it as an array. Accept both so the value is never lost.
export function firstRow<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}
