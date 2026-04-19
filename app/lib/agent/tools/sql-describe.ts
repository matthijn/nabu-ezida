export const SQL_ARG_DESCRIPTION = `DuckDB SQL with SEMANTIC extension:
- ILIKE: verbatim strings only — names, dates, IDs, product codes.
- SEMANTIC('passage description'): meaning — synonyms, paraphrases, concepts.
  Describe the passage, not the query. Use a phrase with context, not a bare word.
  Weak: SEMANTIC('complaint') — too narrow, behaves like ILIKE.
  Strong: SEMANTIC('customer expressing dissatisfaction or frustration').
  Antipattern: \`col ILIKE '%complaint%' OR col ILIKE '%unhappy%' OR col ILIKE '%frustrated%'\`
  — synonyms of one concept. Use SEMANTIC instead.

Fine: \`name ILIKE '%smith%' OR name ILIKE '%jones%'\` — distinct literal values.
Combine: literals stay in ILIKE even when the surrounding concept is SEMANTIC.`
