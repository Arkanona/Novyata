import ClassicTemplate from './ClassicTemplate'
import ModernTemplate from './ModernTemplate'
import MinimalTemplate from './MinimalTemplate'
import { CorporateTemplate, CreativeTemplate, ElegantTemplate, ManagerTemplate, StudentTemplate, TechTemplate } from './PremiumTemplates'

export const templateRegistry = [
  { id: 'classic', name: 'Classique', description: 'Formel, structuré et intemporel.', plan: 'free', component: ClassicTemplate },
  { id: 'modern', name: 'Moderne', description: 'Deux colonnes et une lecture dynamique.', plan: 'free', component: ModernTemplate },
  { id: 'minimal', name: 'Minimal', description: 'Éditorial, aéré et essentiel.', plan: 'free', component: MinimalTemplate },
  { id: 'corporate', name: 'Corporate', description: 'Une hiérarchie nette pour les environnements structurés.', plan: 'pro', component: CorporateTemplate },
  { id: 'elegant', name: 'Élégant', description: 'Une composition éditoriale, sobre et soignée.', plan: 'pro', component: ElegantTemplate },
  { id: 'tech', name: 'Tech', description: 'Les compétences techniques au premier plan.', plan: 'pro', component: TechTemplate },
  { id: 'creative', name: 'Créatif sobre', description: 'Une colonne latérale expressive, sans surcharge.', plan: 'pro', component: CreativeTemplate },
  { id: 'student', name: 'Étudiant / Junior', description: 'La formation et le potentiel d’abord.', plan: 'pro', component: StudentTemplate },
  { id: 'manager', name: 'Manager / Cadre', description: 'Une synthèse et un parcours de responsabilités.', plan: 'pro', component: ManagerTemplate },
]

export const templateById = Object.fromEntries(templateRegistry.map((template) => [template.id, template]))
export const FREE_TEMPLATE_IDS = templateRegistry.filter((template) => template.plan === 'free').map((template) => template.id)
export const PRO_TEMPLATE_IDS = templateRegistry.filter((template) => template.plan === 'pro').map((template) => template.id)
export const templateAvailableForPlan = (templateId, plan) => templateById[templateId]?.plan === 'free' || plan === 'pro'
