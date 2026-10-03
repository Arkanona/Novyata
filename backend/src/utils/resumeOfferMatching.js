const OFFER_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Angular', 'Node.js', 'Express', 'Python', 'Java', 'C#', 'C++', 'PHP', 'Ruby', 'Go', 'Rust',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Power BI', 'Tableau', 'Looker', 'Excel', 'PowerPoint', 'Figma', 'Sketch', 'Adobe XD',
  'HTML', 'CSS', 'Sass', 'Tailwind CSS', 'Git', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud', 'Linux', 'CI/CD', 'REST API', 'GraphQL',
  'Agile', 'Scrum', 'Kanban', 'Jira', 'SEO', 'Google Analytics', 'UX research', 'recherche utilisateur', 'wireframes', 'design system', 'accessibilité',
  'A/B testing', 'tests utilisateurs', 'gestion de projet', 'analyse de données', 'data visualisation', 'machine learning', 'communication', 'anglais',
]

function normalize(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr-FR')
}

function containsPhrase(text, phrase) {
  const source = normalize(text)
  const value = normalize(phrase)
  if (value.length > 3 && /^[a-z0-9 .+#/-]+$/.test(value)) return source.includes(value)
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'u').test(source)
}

export function compareResumeToOffer(resume, offerSkills) {
  const corpus = [resume.job_title, resume.summary, ...(resume.skills || []).flatMap((skill) => [skill.name, skill.level]), ...(resume.experiences || []).flatMap((experience) => [experience.job_title, experience.company, experience.description]), ...(resume.educations || []).flatMap((education) => [education.degree, education.school, education.description])].filter(Boolean).join(' ')
  const present = offerSkills.filter((skill) => containsPhrase(corpus, skill))
  const absent = offerSkills.filter((skill) => !present.includes(skill))
  return {
    resumeId: resume.id_resume,
    title: resume.title_resume,
    jobTitle: resume.job_title || '',
    score: offerSkills.length ? Math.round((present.length / offerSkills.length) * 100) : null,
    matchedSkills: present.slice(0, 8),
    missingSkills: absent.slice(0, 6),
    skillsCompared: offerSkills.length,
  }
}

export function matchResumesToOffer({ resumes, jobDescription }) {
  const offerSkills = OFFER_SKILLS.filter((skill) => containsPhrase(jobDescription, skill))
  return {
    skillsCompared: offerSkills.length,
    results: resumes.map((resume) => compareResumeToOffer(resume, offerSkills)).sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.title.localeCompare(b.title)),
  }
}
