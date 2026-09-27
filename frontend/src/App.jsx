import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import PrivateRoute from './components/layout/PrivateRoute'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import ResumeEditorPage from './pages/ResumeEditorPage'
import ResumeListPage from './pages/ResumeListPage'
import { AuthProvider } from './store/AuthContext'

export default function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/connexion" element={<AuthPage mode="signin" />} />
    <Route path="/inscription" element={<AuthPage mode="signup" />} />
    <Route element={<PrivateRoute />}><Route element={<AppLayout />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/cv" element={<ResumeListPage />} />
      <Route path="/cv/nouveau" element={<ResumeEditorPage isNew />} />
      <Route path="/cv/:id" element={<ResumeEditorPage />} />
    </Route></Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></AuthProvider></BrowserRouter>
}
