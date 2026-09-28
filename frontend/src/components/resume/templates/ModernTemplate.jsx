import { content, dateRange, SectionTitle } from './templateUtils'

export default function ModernTemplate({ resume }) {
  const data = content(resume)
  const initials = [resume.first_name, resume.last_name].filter(Boolean).map((word) => word[0]).join('').slice(0, 2)
  return <article className="resume-preview-paper modern-template"><div className="modern-layout">
    <aside className="modern-sidebar"><div className="modern-avatar">{initials || 'CV'}</div>{data.fullName && <b className="modern-side-name">{data.fullName}</b>}
      {data.contact.length > 0 && <div className="modern-contact">{data.contact.map((item) => <p key={item}>{item}</p>)}</div>}
      {data.skills.length > 0 && <section><SectionTitle>Compétences</SectionTitle>{data.skills.map((item) => <p className="modern-meter" key={item.id_skill}><b>{item.name}</b>{item.level && <span>{item.level}</span>}</p>)}</section>}
      {data.languages.length > 0 && <section><SectionTitle>Langues</SectionTitle>{data.languages.map((item) => <p className="modern-meter" key={item.id_language}><b>{item.name}</b>{item.level && <span>{item.level}</span>}</p>)}</section>}
    </aside>
    <main className="modern-main">{(data.fullName || resume.job_title) && <header><h1>{data.fullName}</h1>{resume.job_title && <p>{resume.job_title}</p>}</header>}{resume.summary && <p className="modern-summary">{resume.summary}</p>}
      {data.experiences.length > 0 && <section><SectionTitle>Expérience professionnelle</SectionTitle>{data.experiences.map((item) => <article className="modern-entry" key={item.id_experience}><div><h3>{item.job_title}</h3>{item.company && <b>{item.company}</b>}{item.description && <p>{item.description}</p>}</div><aside className="modern-entry-meta">{dateRange(item)}{item.city && <span>{item.city}</span>}</aside></article>)}</section>}
      {data.educations.length > 0 && <section><SectionTitle>Formation</SectionTitle>{data.educations.map((item) => <article className="modern-entry" key={item.id_education}><div><h3>{item.degree}</h3>{item.school && <b>{item.school}</b>}{item.description && <p>{item.description}</p>}</div><aside className="modern-entry-meta">{dateRange(item)}{item.city && <span>{item.city}</span>}</aside></article>)}</section>}
    </main>
  </div></article>
}
