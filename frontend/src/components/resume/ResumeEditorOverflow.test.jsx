import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../services/resumeService', () => ({ updateResume: vi.fn(), generateResumeSummary: vi.fn(), improveResumeSummary: vi.fn(), createExperience: vi.fn(), updateExperience: vi.fn(), deleteExperience: vi.fn(), createEducation: vi.fn(), updateEducation: vi.fn(), deleteEducation: vi.fn(), createSkill: vi.fn(), updateSkill: vi.fn(), deleteSkill: vi.fn(), createLanguage: vi.fn(), updateLanguage: vi.fn(), deleteLanguage: vi.fn() }))
vi.mock('./ResumePreview', () => ({ default: ({ onOverflowChange }) => { queueMicrotask(() => onOverflowChange(true)); return <div>Aperçu A4</div> } }))

import ResumeEditor, { RESUME_OVERFLOW_WARNING } from './ResumeEditor'

const resume = { id_resume: 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b', first_name: 'Thomas', last_name: 'Bernard', job_title: 'Product Designer', email: 'thomas@example.com', template_key: 'classic' }

describe('ResumeEditor vertical overflow warning', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('warns the user when the A4 preview exceeds its available height', async () => {
    render(<MemoryRouter><ResumeEditor resume={resume} onSaved={vi.fn()} /></MemoryRouter>)
    expect((await screen.findByRole('alert')).textContent).toBe(RESUME_OVERFLOW_WARNING)
  })
})
