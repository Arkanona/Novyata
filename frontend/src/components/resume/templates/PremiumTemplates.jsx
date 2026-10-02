import { content, dateRange, SectionTitle } from './templateUtils'
import { hasAdvancedSectionLayout } from './OrderedTemplateSections'

function Entries({ items, kind = 'experience', className = '' }) {
  const isExperience = kind === 'experience'
  return items.map((item) => <article className={className} key={isExperience ? item.id_experience : item.id_education}>
    <div><h3>{isExperience ? item.job_title : item.degree}</h3><b>{isExperience ? item.company : item.school}</b>{item.description && <p>{item.description}</p>}</div>
    <aside>{dateRange(item)}{item.city && <span>{item.city}</span>}</aside>
  </article>)
}

function Header({ resume, data, className = '' }) {
  return <header className={className}><h1>{data.fullName || 'Votre nom'}</h1>{resume.job_title && <p>{resume.job_title}</p>}{data.contact.length > 0 && <small>{data.contact.join(' · ')}</small>}</header>
}

function SkillList({ skills, className = '' }) {
  return skills.length > 0 && <section className={className}><SectionTitle>Compétences</SectionTitle><div className="pro-skill-list">{skills.map((skill) => <span key={skill.id_skill}>{skill.name}</span>)}</div></section>
}

function LanguageList({ languages, className = '' }) {
  return languages.length > 0 && <section className={className}><SectionTitle>Langues</SectionTitle><div className="pro-language-list">{languages.map((language) => <p key={language.id_language}><b>{language.name}</b>{language.level && <span>{language.level}</span>}</p>)}</div></section>
}

function OrderedProSections({ resume, data, template }) {
  const custom = (resume.custom_sections || []).filter((item) => item.title?.trim() && item.content?.trim())
  const available = [
    ...(resume.summary?.trim() ? ['summary'] : []),
    ...(data.experiences.length ? ['experiences'] : []),
    ...(data.educations.length ? ['educations'] : []),
    ...(data.skills.length ? ['skills'] : []),
    ...(data.languages.length ? ['languages'] : []),
    ...custom.map((item) => `custom:${item.id_resume_section}`),
  ]
  const savedOrder = Array.isArray(resume.section_order) ? resume.section_order : ['summary', 'experiences', 'educations', 'skills', 'languages']
  const order = [...savedOrder.filter((key) => available.includes(key)), ...available.filter((key) => !savedOrder.includes(key))]
  return order.map((key) => {
    if (key === 'summary') return <section className={`pro-${template}-ordered-summary`} key={key}><SectionTitle>{template === 'manager' ? 'Synthèse exécutive' : 'Profil'}</SectionTitle><p>{resume.summary}</p></section>
    if (key === 'experiences' || key === 'educations') {
      const isExperience = key === 'experiences'
      const items = isExperience ? data.experiences : data.educations
      const label = isExperience ? (template === 'manager' ? 'Expérience de direction' : 'Expérience professionnelle') : 'Formation'
      return <section key={key}><SectionTitle>{label}</SectionTitle><Entries kind={isExperience ? 'experience' : 'education'} items={items} className={`pro-${template}-entry`} /></section>
    }
    if (key === 'skills') return <SkillList key={key} skills={data.skills} className={`pro-${template}-ordered-list`} />
    if (key === 'languages') return <LanguageList key={key} languages={data.languages} className={`pro-${template}-ordered-list`} />
    if (key.startsWith('custom:')) {
      const item = custom.find((section) => `custom:${section.id_resume_section}` === key)
      return item && <section className={`template-custom-section template-custom-section--${template}`} key={key}><SectionTitle>{item.title}</SectionTitle><p>{item.content}</p></section>
    }
    return null
  })
}

export function CorporateTemplate({ resume }) {
  const data = content(resume)
  const ordered = hasAdvancedSectionLayout(resume)
  return <article className="resume-preview-paper pro-corporate-template">
    <Header resume={resume} data={data} className="pro-corporate-header" />
    {ordered ? <OrderedProSections resume={resume} data={data} template="corporate" /> : <>
    {resume.summary && <section className="pro-corporate-summary"><SectionTitle>Profil professionnel</SectionTitle><p>{resume.summary}</p></section>}
    {data.experiences.length > 0 && <section><SectionTitle>Expérience professionnelle</SectionTitle><Entries items={data.experiences} className="pro-corporate-entry" /></section>}
    {data.educations.length > 0 && <section><SectionTitle>Formation</SectionTitle><Entries kind="education" items={data.educations} className="pro-corporate-entry" /></section>}
    <div className="pro-corporate-footer"><SkillList skills={data.skills} /><LanguageList languages={data.languages} /></div>
    </>}
  </article>
}

export function ElegantTemplate({ resume }) {
  const data = content(resume)
  const ordered = hasAdvancedSectionLayout(resume)
  return <article className="resume-preview-paper pro-elegant-template">
    <Header resume={resume} data={data} className="pro-elegant-header" />
    {ordered ? <OrderedProSections resume={resume} data={data} template="elegant" /> : <>
    {resume.summary && <section><SectionTitle>Profil</SectionTitle><p>{resume.summary}</p></section>}
    {data.experiences.length > 0 && <section><SectionTitle>Parcours professionnel</SectionTitle><Entries items={data.experiences} className="pro-elegant-entry" /></section>}
    {data.educations.length > 0 && <section><SectionTitle>Formation</SectionTitle><Entries kind="education" items={data.educations} className="pro-elegant-entry" /></section>}
    <div className="pro-elegant-footer"><SkillList skills={data.skills} /><LanguageList languages={data.languages} /></div>
    </>}
  </article>
}

export function TechTemplate({ resume }) {
  const data = content(resume)
  const ordered = hasAdvancedSectionLayout(resume)
  return <article className="resume-preview-paper pro-tech-template">
    <Header resume={resume} data={data} className="pro-tech-header" />
    <div className="pro-tech-grid"><aside>{data.contact.length > 0 && <section><SectionTitle>Contact</SectionTitle>{data.contact.map((item) => <p key={item}>{item}</p>)}</section>}{!ordered && <><SkillList skills={data.skills} /><LanguageList languages={data.languages} /></>}</aside>
      <main>{ordered ? <OrderedProSections resume={resume} data={data} template="tech" /> : <>{resume.summary && <section><SectionTitle>Profil</SectionTitle><p>{resume.summary}</p></section>}{data.experiences.length > 0 && <section><SectionTitle>Expérience</SectionTitle><Entries items={data.experiences} className="pro-tech-entry" /></section>}{data.educations.length > 0 && <section><SectionTitle>Formation</SectionTitle><Entries kind="education" items={data.educations} className="pro-tech-entry" /></section>}</>}</main>
    </div>
  </article>
}

export function CreativeTemplate({ resume }) {
  const data = content(resume)
  const ordered = hasAdvancedSectionLayout(resume)
  return <article className="resume-preview-paper pro-creative-template">
    <aside className="pro-creative-rail"><div className="pro-creative-monogram">{[resume.first_name, resume.last_name].filter(Boolean).map((part) => part[0]).join('').slice(0, 2) || 'CV'}</div>{data.contact.map((item) => <p key={item}>{item}</p>)}{!ordered && <><SkillList skills={data.skills} /><LanguageList languages={data.languages} /></>}</aside>
    <main><Header resume={resume} data={data} className="pro-creative-header" />{ordered ? <OrderedProSections resume={resume} data={data} template="creative" /> : <>{resume.summary && <section><SectionTitle>En bref</SectionTitle><p>{resume.summary}</p></section>}{data.experiences.length > 0 && <section><SectionTitle>Expérience</SectionTitle><Entries items={data.experiences} className="pro-creative-entry" /></section>}{data.educations.length > 0 && <section><SectionTitle>Formation</SectionTitle><Entries kind="education" items={data.educations} className="pro-creative-entry" /></section>}</>}</main>
  </article>
}

export function StudentTemplate({ resume }) {
  const data = content(resume)
  const ordered = hasAdvancedSectionLayout(resume)
  return <article className="resume-preview-paper pro-student-template">
    <Header resume={resume} data={data} className="pro-student-header" />
    {ordered ? <OrderedProSections resume={resume} data={data} template="student" /> : <>
    {resume.summary && <section className="pro-student-summary"><SectionTitle>Profil</SectionTitle><p>{resume.summary}</p></section>}
    {data.educations.length > 0 && <section><SectionTitle>Formation</SectionTitle><Entries kind="education" items={data.educations} className="pro-student-entry" /></section>}
    {data.experiences.length > 0 && <section><SectionTitle>Expériences</SectionTitle><Entries items={data.experiences} className="pro-student-entry" /></section>}
    <div className="pro-student-footer"><SkillList skills={data.skills} /><LanguageList languages={data.languages} /></div>
    </>}
  </article>
}

export function ManagerTemplate({ resume }) {
  const data = content(resume)
  const ordered = hasAdvancedSectionLayout(resume)
  return <article className="resume-preview-paper pro-manager-template">
    <Header resume={resume} data={data} className="pro-manager-header" />
    {ordered ? <OrderedProSections resume={resume} data={data} template="manager" /> : <>
    {resume.summary && <section className="pro-manager-summary"><SectionTitle>Synthèse exécutive</SectionTitle><p>{resume.summary}</p></section>}
    <div className="pro-manager-grid"><main>{data.experiences.length > 0 && <section><SectionTitle>Expérience de direction</SectionTitle><Entries items={data.experiences} className="pro-manager-entry" /></section>}{data.educations.length > 0 && <section><SectionTitle>Formation</SectionTitle><Entries kind="education" items={data.educations} className="pro-manager-entry" /></section>}</main><aside><SkillList skills={data.skills} /><LanguageList languages={data.languages} /></aside></div>
    </>}
  </article>
}
