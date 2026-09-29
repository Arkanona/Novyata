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
    for (const template of ['classic', 'modern', 'minimal']) {
      const { container, unmount } = render(<TemplatePreview template={template} resume={{ ...resume, template_key: template, font_size: fontSize }} />)
      const preview = container.querySelector('.template-preview')
      expect(preview.classList.contains('font-' + fontSize)).toBe(true)
      expect(preview.style.getPropertyValue('--resume-font-scale')).toBe(scale)
      expect(preview.style.getPropertyValue('--resume-line-scale')).toBe(lineScale)
      unmount()
    }
  })
})
