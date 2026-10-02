import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import TemplatePreview from './TemplatePreview'

const resume = { first_name: 'Thomas', last_name: 'Bernard', job_title: 'Product Designer', accent_color: '#314A67', experiences: [], educations: [], skills: [], languages: [] }

describe('TemplatePreview text sizes', () => {
  it.each([
    ['small', '0.9', '0.96'],
    ['normal', '1', '1'],
    ['large', '1.1', '1.04'],
  ])('applies the %s typography variables to every template', (fontSize, scale, lineScale) => {
    for (const template of ['classic', 'modern', 'minimal', 'corporate', 'elegant', 'tech', 'creative', 'student', 'manager']) {
      const { container, unmount } = render(<TemplatePreview template={template} resume={{ ...resume, template_key: template, font_size: fontSize }} />)
      const preview = container.querySelector('.template-preview')
      expect(preview.classList.contains('font-' + fontSize)).toBe(true)
      expect(preview.style.getPropertyValue('--resume-font-scale')).toBe(scale)
      expect(preview.style.getPropertyValue('--resume-line-scale')).toBe(lineScale)
      unmount()
    }
  })
})

describe('Free resume templates remain unchanged and available', () => {
  it.each([
    ['classic', 'classic-template'],
    ['modern', 'modern-template'],
    ['minimal', 'minimal-template'],
  ])('keeps the established %s template component in its preview', (template, componentClass) => {
    const { container } = render(<TemplatePreview template={template} resume={{ ...resume, template_key: template }} />)
    expect(container.querySelector('.resume-preview-paper').classList.contains(componentClass)).toBe(true)
  })
})

describe('advanced resume sections', () => {
  it.each(['classic', 'modern', 'minimal', 'corporate', 'elegant', 'tech', 'creative', 'student', 'manager'])('renders saved custom sections in the chosen order for %s', (template) => {
    const extended = {
      ...resume,
      template_key: template,
      summary: 'Profil professionnel.',
      experiences: [{ id_experience: 'exp-1', job_title: 'Designer', company: 'Novyata', description: 'Conception produit.', start_date: '2024-01-01', is_current: true }],
      custom_sections: [{ id_resume_section: 'section-1', title: 'Projets', content: 'Prototype livré.' }],
      section_order: ['custom:section-1', 'summary', 'experiences', 'educations', 'skills', 'languages'],
    }
    const { container } = render(<TemplatePreview resume={extended} />)
    const paperText = container.querySelector('.resume-preview-paper').textContent
    expect(paperText).toContain('Prototype livré.')
    expect(paperText.indexOf('Projets')).toBeLessThan(paperText.indexOf('Profil'))
  })
})
