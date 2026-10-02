import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import { createResume, deleteResume, getResume, listResumes, updateResume } from '../controllers/resumeController.js'
import { createEducation, createExperience, deleteEducation, deleteExperience, updateEducation, updateExperience } from '../controllers/resumeSectionController.js'
import { createLanguage, createSkill, deleteLanguage, deleteSkill, updateLanguage, updateSkill } from '../controllers/resumeTagController.js'
import { createCustomSection, createResumeVariant, deleteCustomSection, reorderResumeSections, updateCustomSection } from '../controllers/resumeProController.js'

const router = Router()
router.use(authenticate)
router.get('/', listResumes)
router.post('/', createResume)
router.post('/:id/variants', createResumeVariant)
router.post('/:id/sections', createCustomSection)
router.patch('/:id/sections/:sectionId', updateCustomSection)
router.delete('/:id/sections/:sectionId', deleteCustomSection)
router.put('/:id/section-order', reorderResumeSections)
router.post('/:id/experiences', createExperience)
router.patch('/:id/experiences/:experienceId', updateExperience)
router.delete('/:id/experiences/:experienceId', deleteExperience)
router.post('/:id/educations', createEducation)
router.patch('/:id/educations/:educationId', updateEducation)
router.delete('/:id/educations/:educationId', deleteEducation)
router.post('/:id/skills', createSkill)
router.patch('/:id/skills/:skillId', updateSkill)
router.delete('/:id/skills/:skillId', deleteSkill)
router.post('/:id/languages', createLanguage)
router.patch('/:id/languages/:languageId', updateLanguage)
router.delete('/:id/languages/:languageId', deleteLanguage)
router.get('/:id', getResume)
router.patch('/:id', updateResume)
router.delete('/:id', deleteResume)

export default router
