import { content, dateRange, SectionTitle } from './templateUtils'

export default function ClassicTemplate({ resume }) {
  const data = content(resume)
  return <article className="resume-preview-paper classic-template">
    {(data.fullName || resume.job_title) && <header className="classic-header"><h1>{data.fullName}</h1>{resume.job_title && <p>{resume.job_title}</p>}</header>}
    {data.contact.length > 0 && <div className="classic-contact">{data.contact.map((item) => <span key={item}>{item}</span>)}</div>}
    {resume.summary && <section className="classic-profile"><SectionTitle>Profil</SectionTitle><p>{resume.summary}</p></section>}
    {data.experiences.length > 0 && <section><SectionTitle>Expériences</SectionTitle><div className="classic-timeline">{data.experiences.map((item) => <article className="classic-entry" key={item.id_experience}><aside><strong>{dateRange(item)}</strong>{item.city && <span>{item.city}</span>}</aside><div><h3>{item.job_title}</h3>{item.company && <b>{item.company}</b>}{item.description && <p>{item.description}</p>}</div></article>)}</div></section>}
    {data.educations.length > 0 && <section><SectionTitle>Formations</SectionTitle><div className="classic-timeline">{data.educations.map((item) => <article className="classic-entry" key={item.id_education}><aside><strong>{dateRange(item)}</strong>{item.city && <span>{item.city}</span>}</aside><div><h3>{item.degree}</h3>{item.school && <b>{item.school}</b>}{item.description && <p>{item.description}</p>}</div></article>)}</div></section>}
    {(data.skills.length > 0 || data.languages.length > 0) && <section className="classic-bottom"><div>{data.skills.length > 0 && <><SectionTitle>Compétences</SectionTitle>{data.skills.map((item) => <p key={item.id_skill}><b>{item.name}</b></p>)}</>}</div><div>{data.languages.length > 0 && <><SectionTitle>Langues</SectionTitle>{data.languages.map((item) => <p key={item.id_language}><b>{item.name}</b>{item.level && <span>{item.level}</span>}</p>)}</>}</div></section>}
  </article>
}
