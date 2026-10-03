import { describe, expect, it } from 'vitest'
import { compareResumeToOffer, matchResumesToOffer } from '../src/utils/resumeOfferMatching.js'

describe('resume offer matching', () => {
  it('estimates overlap from existing resume content without using external calls', () => {
    const result = compareResumeToOffer({ id_resume: 'r1', title_resume: 'CV Data', job_title: 'Analyste', summary: '', skills: [{ name: 'SQL' }], experiences: [{ description: 'Création de rapports avec Power BI.' }] }, ['SQL', 'Power BI', 'Python'])
    expect(result).toMatchObject({ resumeId: 'r1', score: 67, matchedSkills: ['SQL', 'Power BI'], missingSkills: ['Python'] })
  })

  it('returns no fake score when no supported job skill is identified', () => {
    const result = matchResumesToOffer({ resumes: [{ id_resume: 'r1', title_resume: 'CV', skills: [] }], jobDescription: 'Nous recherchons une personne curieuse.' })
    expect(result).toEqual({ skillsCompared: 0, results: [expect.objectContaining({ score: null, skillsCompared: 0 })] })
  })
})
