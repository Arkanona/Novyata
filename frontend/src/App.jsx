import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import PrivateRoute from './components/layout/PrivateRoute'
import AuthPage from './pages/AuthPage'
import { PasswordRecoveryPage, VerifyEmailPage } from './pages/AccountRecoveryPage'
import HomePage from './pages/HomePage'
import LegalPage from './pages/LegalPage'
import FeaturesPage from './pages/FeaturesPage'
import ModelsPage from './pages/ModelsPage'
import NotFoundPage from './pages/NotFoundPage'
import PricingPage from './pages/PricingPage'
import { AuthProvider } from './store/AuthContext'

const ApplicationEditorPage = lazy(() => import('./pages/ApplicationEditorPage'))
const ApplicationListPage = lazy(() => import('./pages/ApplicationListPage'))
const CoverLetterEditorPage = lazy(() => import('./pages/CoverLetterEditorPage'))
const CoverLetterListPage = lazy(() => import('./pages/CoverLetterListPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const JobAnalysisPage = lazy(() => import('./pages/JobAnalysisPage'))
const JobAnalysisDetailPage = lazy(() => import('./pages/JobAnalysisDetailPage'))
const JobAnalysisListPage = lazy(() => import('./pages/JobAnalysisListPage'))
const ResumeEditorPage = lazy(() => import('./pages/ResumeEditorPage'))
const ResumeListPage = lazy(() => import('./pages/ResumeListPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const SavedAnswersPage = lazy(() => import('./pages/SavedAnswersPage'))
const ActivityHistoryPage = lazy(() => import('./pages/ActivityHistoryPage'))

function PageFallback() {
  return <main className="route-loading" role="status" aria-live="polite">Chargement de votre espace…</main>
}

function lazyPage(Page, props) {
  return <Suspense fallback={<PageFallback />}><Page {...props} /></Suspense>
}

export default function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/connexion" element={<AuthPage mode="signin" />} />
    <Route path="/inscription" element={<AuthPage mode="signup" />} />
    <Route path="/mot-de-passe-oublie" element={<PasswordRecoveryPage />} />
    <Route path="/reinitialiser-mot-de-passe" element={<PasswordRecoveryPage reset />} />
    <Route path="/verifier-email" element={<VerifyEmailPage />} />
    <Route path="/pro" element={<PricingPage />} />
    <Route path="/tarifs" element={<PricingPage />} />
    <Route path="/fonctionnalites" element={<FeaturesPage />} />
    <Route path="/modeles" element={<ModelsPage />} />
    <Route path="/mentions-legales" element={<LegalPage />} />
    <Route path="/confidentialite" element={<LegalPage />} />
    <Route path="/conditions" element={<LegalPage />} />
    <Route path="/cookies" element={<LegalPage />} />
    <Route element={<PrivateRoute />}><Route element={<AppLayout />}>
      <Route path="/dashboard" element={lazyPage(DashboardPage)} />
      <Route path="/cv" element={lazyPage(ResumeListPage)} />
      <Route path="/cv/nouveau" element={lazyPage(ResumeEditorPage, { isNew: true })} />
      <Route path="/cv/:id" element={lazyPage(ResumeEditorPage)} />
      <Route path="/lettres" element={lazyPage(CoverLetterListPage)} />
      <Route path="/lettres/nouvelle" element={lazyPage(CoverLetterEditorPage, { isNew: true })} />
      <Route path="/lettres/:id" element={lazyPage(CoverLetterEditorPage)} />
      <Route path="/candidatures" element={lazyPage(ApplicationListPage)} />
      <Route path="/candidatures/nouvelle" element={lazyPage(ApplicationEditorPage, { isNew: true })} />
      <Route path="/candidatures/:id" element={lazyPage(ApplicationEditorPage)} />
      <Route path="/analyse-offre" element={lazyPage(JobAnalysisPage)} />
      <Route path="/analyses" element={lazyPage(JobAnalysisListPage)} />
      <Route path="/analyses/:id" element={lazyPage(JobAnalysisDetailPage)} />
      <Route path="/parametres" element={lazyPage(SettingsPage)} />
      <Route path="/reponses" element={lazyPage(SavedAnswersPage)} />
      <Route path="/historique" element={lazyPage(ActivityHistoryPage)} />
    </Route></Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></AuthProvider></BrowserRouter>
}
