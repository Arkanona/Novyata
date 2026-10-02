import { compactDateRange, content, CustomTemplateSection, dateRange, orderedResumeSectionKeys, SectionTitle } from './templateUtils'

function sectionView(key, kind, data, resume, customSections) {
  if (key === 'summary') return resume.summary?.trim() ? <section key={key} className={`${kind}-ordered-summary`}><SectionTitle>{kind === 'minimal' ? 'À propos' : 'Profil'}</SectionTitle><p>{resume.summary}</p></section> : null
  if (key === 'experiences' || key === 'educations') {
    const isExperience = key === 'experiences'
    const items = isExperience ? data.experiences : data.educations
    if (!items.length) return null
    const heading = isExperience ? (kind === 'modern' ? 'Expérience professionnelle' : 'Expériences') : (kind === 'modern' ? 'Formation' : 'Formations')
    const className = kind === 'classic' ? 'classic-timeline' : ''
    return <section key={key}><SectionTitle>{heading}</SectionTitle><div className={className}>{items.map((item) => {
      const title = isExperience ? item.job_title : item.degree
      const organization = isExperience ? item.company : item.school
      const id = isExperience ? item.id_experience : item.id_education
      const dates = kind === 'classic' ? compactDateRange(item) : dateRange(item)
      const Entry = kind === 'modern' ? 'article' : 'article'
      return <Entry key={id} className={`${kind}-entry`}>
        {kind === 'classic' && <aside><strong>{dates}</strong>{item.city && <span>{item.city}</span>}</aside>}
        <div><h3>{title}</h3>{organization && <b>{organization}</b>}{item.description && <p>{item.description}</p>}</div>
        {kind !== 'classic' && <aside className={kind === 'modern' ? 'modern-entry-meta' : undefined}>{dates}{item.city && <span>{item.city}</span>}</aside>}
      </Entry>
    })}</div></section>
  }
  if (key === 'skills' && data.skills.length) return <section key={key}><SectionTitle>Compétences</SectionTitle>{kind === 'classic' ? data.skills.map((item) => <p key={item.id_skill}><b>{item.name}</b></p>) : kind === 'modern' ? <div className="modern-ordered-list">{data.skills.map((item) => <span key={item.id_skill}>{item.name}</span>)}</div> : <p className="minimal-list">{data.skills.map((item) => <span key={item.id_skill}>{item.name}</span>)}</p>}</section>
  if (key === 'languages' && data.languages.length) return <section key={key}><SectionTitle>Langues</SectionTitle>{kind === 'classic' ? data.languages.map((item) => <p key={item.id_language}><b>{item.name}</b>{item.level && <span> {item.level}</span>}</p>) : kind === 'modern' ? <div className="modern-ordered-list">{data.languages.map((item) => <span key={item.id_language}>{item.name}{item.level && ` · ${item.level}`}</span>)}</div> : <p className="minimal-list">{data.languages.map((item) => <span key={item.id_language}>{item.name}{item.level && <small>{item.level}</small>}</span>)}</p>}</section>
  if (key.startsWith('custom:')) {
    const item = customSections.find((section) => `custom:${section.id_resume_section}` === key)
    return item ? <CustomTemplateSection key={key} item={item} className={`template-custom-section--${kind}`} /> : null
  }
  return null
}

export default function OrderedTemplateSections({ resume, kind }) {
  const data = content(resume)
  const customSections = (resume.custom_sections || []).filter((item) => item.title?.trim() && item.content?.trim())
  const available = ['summary', 'experiences', 'educations', 'skills', 'languages'].filter((key) => {
    if (key === 'summary') return Boolean(resume.summary?.trim())
    if (key === 'experiences') return data.experiences.length > 0
    if (key === 'educations') return data.educations.length > 0
    if (key === 'skills') return data.skills.length > 0
    return data.languages.length > 0
  })
  for (const section of customSections) available.push(`custom:${section.id_resume_section}`)
  return <>{orderedResumeSectionKeys(resume, available).map((key) => sectionView(key, kind, data, resume, customSections))}</>
}

export function hasAdvancedSectionLayout(resume) {
  const defaultOrder = ['summary', 'experiences', 'educations', 'skills', 'languages']
  return Boolean(resume.custom_sections?.length) || JSON.stringify(resume.section_order || defaultOrder) !== JSON.stringify(defaultOrder)
}
