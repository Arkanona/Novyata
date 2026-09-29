function senderDetails(resume, user) {
  const fullName = [resume?.first_name || user?.first_name, resume?.last_name || user?.last_name].filter(Boolean).join(' ')
  return [fullName, resume?.job_title, resume?.city, resume?.email, resume?.phone].filter(Boolean)
}

export function letterCharacterCount(content = '') {
  return typeof content === 'string' ? content.length : 0
}

export function letterWordCount(content = '') {
  const text = typeof content === 'string' ? content.trim() : ''
  return text ? text.split(/\s+/).length : 0
}

export default function CoverLetterPreview({ letter, resume, user, pdf = false }) {
  const sender = senderDetails(resume, user)
  const template = letter.template === 'modern' ? 'modern' : 'classic'
  return <div className={'cover-letter-preview cover-letter-template-' + template + (pdf ? ' cover-letter-preview--pdf' : '')}>
    <article className="cover-letter-paper">
      <header className="cover-letter-sender">
        <div>{sender.map((item) => <p key={item}>{item}</p>)}</div>
        <div className="cover-letter-recipient">{letter.recipient_name && <p>{letter.recipient_name}</p>}{letter.recipient_position && <p>{letter.recipient_position}</p>}{letter.company_name && <p>{letter.company_name}</p>}{letter.company_address && <p>{letter.company_address}</p>}</div>
      </header>
      <section className="cover-letter-body">
        {letter.subject && <p className="cover-letter-subject"><b>Objet :</b> {letter.subject}</p>}
        <p className="cover-letter-greeting">Madame, Monsieur,</p>
        <p className="cover-letter-content">{letter.content || 'Votre lettre apparaîtra ici au fur et à mesure de votre rédaction.'}</p>
        <p className="cover-letter-signature">Cordialement,<br />{sender[0]}</p>
      </section>
    </article>
  </div>
}
