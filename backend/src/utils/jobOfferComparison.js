function labeledValue(text, labels) {
  const match = text.match(new RegExp(`(?:${labels})\\s*[:–-]\\s*([^\\n.;]{2,100})`, 'i'))
  return match?.[1]?.trim() || ''
}

function exactSalary(text) {
  return text.match(/\d[\d\s.,]*\s?(?:€|euros?|k€)/i)?.[0]?.trim() || text.match(/(?:salaire|rémunération)\s*[:–-]\s*[^\n.;]{2,70}/i)?.[0]?.trim() || ''
}

export function summarizeSavedOffer(row) {
  const text = String(row.job_description || '')
  const analysis = row.analysis_result && typeof row.analysis_result === 'object' ? row.analysis_result : {}
  const requirements = Array.isArray(analysis.requirements) ? analysis.requirements.filter((item) => item?.name).slice(0, 6).map((item) => item.name) : []
  const benefits = text.split(/\n+/).map((line) => line.trim()).filter((line) => /avantage|mutuelle|tickets? restaurant|congés|prime|intéressement|participation|transport/i.test(line)).slice(0, 3)
  return {
    id: row.id_job_analysis,
    companyName: row.company_name || '',
    jobTitle: row.job_title || '',
    location: labeledValue(text, 'localisation|lieu|poste basé(?:e)?|ville'),
    contractType: (text.match(/\b(CDI|CDD|stage|alternance|freelance|intérim|temps plein|temps partiel)\b/ig) || []).filter((value, index, values) => values.findIndex((item) => item.toLowerCase() === value.toLowerCase()) === index).slice(0, 3).join(', '),
    remote: /télétravail|teletravail|remote|hybride/i.test(text) ? (text.match(/[^\n.;]*(?:télétravail|teletravail|remote|hybride)[^\n.;]*/i)?.[0]?.trim() || 'Mentionné dans l’offre') : '',
    salary: exactSalary(text),
    importantRequirements: requirements,
    matchScore: Number.isInteger(row.match_score) ? row.match_score : null,
    explicitBenefits: benefits,
  }
}
