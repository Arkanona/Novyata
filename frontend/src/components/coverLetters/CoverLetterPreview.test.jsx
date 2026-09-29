import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import CoverLetterPreview, { letterCharacterCount, letterWordCount } from './CoverLetterPreview'
import { coverLetterPdfFilename } from '../../services/coverLetterPdfExport'

const letter = {
  title: 'Lettre Product Designer', company_name: 'Équipe & Co', job_title: 'Product Designer', recipient_name: 'Madame Martin', recipient_position: 'Responsable RH', company_address: '10 rue de Paris', subject: 'Candidature', content: 'Je souhaite vous proposer ma candidature avec enthousiasme.', template: 'classic',
}
const resume = { first_name: 'Élise', last_name: 'Durand', email: 'elise@example.com', phone: '0600000000', city: 'Paris' }

describe('CoverLetterPreview', () => {
  it.each(['classic', 'modern'])('renders the %s template for the editor and PDF', (template) => {
    const { container } = render(<CoverLetterPreview letter={{ ...letter, template }} resume={resume} pdf />)
    expect(container.querySelector('.cover-letter-template-' + template)).toBeTruthy()
    expect(container.querySelector('.cover-letter-paper')).toBeTruthy()
    expect(container.textContent).toContain('Élise Durand')
    expect(container.textContent).toContain(letter.content)
  })

  it('counts words and characters without changing the content', () => {
    expect(letterWordCount('Un texte simple')).toBe(3)
    expect(letterWordCount('   ')).toBe(0)
    expect(letterWordCount(null)).toBe(0)
    expect(letterCharacterCount('abc')).toBe(3)
    expect(letterCharacterCount(null)).toBe(0)
  })

  it('creates the expected PDF filename from company and sender', () => {
    expect(coverLetterPdfFilename(letter, resume)).toBe('Lettre_Equipe_Co_Elise_Durand.pdf')
  })
})
