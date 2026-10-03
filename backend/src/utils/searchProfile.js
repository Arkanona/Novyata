const preferenceFields = ['roles', 'location', 'contract_type', 'remote_work', 'availability', 'salary', 'sectors']

export function compactSearchProfile(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(preferenceFields
    .map((field) => [field, typeof value[field] === 'string' ? value[field].trim().slice(0, 160) : ''])
    .filter(([, text]) => text))
}
