import { content, dateRange, SectionTitle } from './templateUtils'

export default function MinimalTemplate({ resume }) {
  const data = content(resume)
  return <article className="resume-preview-paper minimal-template">
    {(data.fullName || resume.job_title) && <header className="minimal-header"><h1>{data.fullName}</h1>{resume.job_title && <p>{resume.job_title}</p>}{data.contact.length > 0 && <small>{data.contact.join('  ·  ')}</small>}</header>}
    {resume.summary && <section><SectionTitle>À propos</SectionTitle><p>{resume.summary}</p></section>}
    {data.experiences.length > 0 && <section><SectionTitle>Expériences</SectionTitle>{data.experiences.map((item) => <article className="minimal-entry" key={item.id_experience}><div><h3>{item.job_title}</h3>{item.company && <b>{item.company}</b>}{item.description && <p>{item.description}</p>}</div><aside>{dateRange(item)}{item.city && <span>{item.city}</span>}</aside></article>)}</section>}
    {data.educations.length > 0 && <section><SectionTitle>Formations</SectionTitle>{data.educations.map((item) => <article className="minimal-entry" key={item.id_education}><div><h3>{item.degree}</h3>{item.school && <b>{item.school}</b>}{item.description && <p>{item.description}</p>}</div><aside>{dateRange(item)}{item.city && <span>{item.city}</span>}</aside></article>)}</section>}
    {data.skills.length > 0 && <section><SectionTitle>Compétences</SectionTitle><p className="minimal-list">{data.skills.map((item) => <span key={item.id_skill}>{item.name}{item.level && <small>{item.level}</small>}</span>)}</p></section>}
    {data.languages.length > 0 && <section><SectionTitle>Langues</SectionTitle><p className="minimal-list">{data.languages.map((item) => <span key={item.id_language}>{item.name}{item.level && <small>{item.level}</small>}</span>)}</p></section>}
  </article>
}
