import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, FileSearch, Lightbulb, ScanSearch } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/common/Button'
import CoverLetterPreview, { letterCharacterCount, letterWordCount } from '../components/coverLetters/CoverLetterPreview'
import { analyzeJobOffer, importOfferFromUrl, matchResumesToOffer } from '../services/jobAnalysisService'
import { generateCoverLetter } from '../services/coverLetterGenerationService'
import { createCoverLetter } from '../services/coverLetterService'
import { getResumes } from '../services/resumeService'
import { useAuth } from '../store/AuthContext'

function TagList({ items, emptyMessage }) {
  return items?.length ? <div className="analysis-tags">{items.map((item) => <span key={item}>{item}</span>)}</div> : <p className="analysis-empty">{emptyMessage}</p>
}

function MatchList({ items = [], emptyMessage }) {
  return items.length ? <ul className="analysis-detail-list">{items.map(({ name, evidence, reason }) => <li key={name}><strong>{name}</strong><span>{reason}</span><em>Preuve : « {evidence} »</em></li>)}</ul> : <p className="analysis-empty">{emptyMessage}</p>
}

function MissingList({ items = [], emptyMessage }) {
  return items.length ? <ul className="analysis-detail-list">{items.map(({ name, reason }) => <li key={name}><strong>{name}</strong><span>{reason}</span></li>)}</ul> : <p className="analysis-empty">{emptyMessage}</p>
}

function letterTitle(companyName, jobTitle) {
  if (companyName) return `Candidature — ${companyName}`
  return jobTitle ? `Candidature — ${jobTitle}` : 'Lettre de motivation'
}

export default function JobAnalysisPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [resumes, setResumes] = useState([])
  const [resumeId, setResumeId] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [offerUrl, setOfferUrl] = useState('')
  const [importedOffer, setImportedOffer] = useState(null)
  const [matching, setMatching] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [generation, setGeneration] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isMatching, setIsMatching] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedResume = useMemo(() => resumes.find((resume) => resume.id_resume === resumeId) || null, [resumes, resumeId])
  useEffect(() => { getResumes().then(({ resumes: list }) => setResumes(list)).catch((requestError) => setError(requestError.message)) }, [])

  function selectResume(event) {
    const value = event.target.value
    setResumeId(value)
    const resume = resumes.find((item) => item.id_resume === value)
    if (resume?.job_title) setJobTitle(resume.job_title)
    setAnalysis(null)
    setGeneration(null)
  }

  function updateJobDescription(event) {
    setJobDescription(event.target.value)
    setAnalysis(null)
    setGeneration(null)
  }

  async function importUrl() {
    setError('')
    if (!offerUrl.trim()) { setError('Saisissez le lien public de l’offre à importer.'); return }
    setIsImporting(true)
    try {
      const { offer } = await importOfferFromUrl(offerUrl.trim())
      setImportedOffer(offer)
      setCompanyName(offer.companyName || '')
      setJobTitle(offer.jobTitle || '')
      setJobDescription(offer.description || '')
      setAnalysis(null)
      setGeneration(null)
    } catch (requestError) { setError(requestError.message) } finally { setIsImporting(false) }
  }

  async function compareResumes() {
    setError('')
    if (!jobDescription.trim()) { setError('Ajoutez le texte de l’offre avant de comparer vos CV.'); return }
    setIsMatching(true)
    try { const result = await matchResumesToOffer(jobDescription); setMatching(result.matching) } catch (requestError) { setError(requestError.message) } finally { setIsMatching(false) }
  }

  async function submit(event) {
    event.preventDefault(); setError(''); setAnalysis(null); setGeneration(null)
    if (!resumeId) { setError('Sélectionnez un CV avant de lancer l’analyse.'); return }
    if (!jobDescription.trim()) { setError('Collez le texte de l’offre avant de lancer l’analyse.'); return }
    setIsLoading(true)
    try { const result = await analyzeJobOffer({ resumeId, jobDescription, companyName, jobTitle }); if (result.analysis.id_job_analysis) navigate('/analyses/' + result.analysis.id_job_analysis); else setAnalysis(result.analysis) } catch (requestError) { setError(requestError.message) } finally { setIsLoading(false) }
  }

  async function createLetterDraft() {
    setError(''); setIsGenerating(true)
    try { const result = await generateCoverLetter({ resumeId, jobDescription, companyName, jobTitle, analysis }); setGeneration(result.generation) } catch (requestError) { setError(requestError.message) } finally { setIsGenerating(false) }
  }

  async function saveGeneratedLetter() {
    if (!generation) return
    setError(''); setIsSaving(true)
    try {
      const { cover_letter: letter } = await createCoverLetter({ title: letterTitle(companyName, jobTitle || selectedResume?.job_title), company_name: companyName || null, job_title: jobTitle || selectedResume?.job_title || null, recipient_name: null, recipient_position: null, company_address: null, subject: generation.subject, content: generation.content, id_resume: resumeId, template: 'classic' })
      navigate('/lettres/' + letter.id_cover_letter)
    } catch (requestError) { setError(requestError.message) } finally { setIsSaving(false) }
  }

  return <main className="app-page job-analysis-page"><header className="app-header"><div><p className="crumb">Optimisez vos candidatures</p><h1>Analyse d’offre</h1></div></header><section className="analysis-intro"><ScanSearch size={24} /><div><h2>Comparez une offre avec votre CV</h2><p>Recevez des recommandations concrètes. Votre CV ne sera jamais modifié automatiquement.</p></div></section><form className="job-analysis-form" onSubmit={submit} noValidate><label>CV à analyser<select value={resumeId} onChange={selectResume}><option value="">Sélectionnez un CV</option>{resumes.map((resume) => <option value={resume.id_resume} key={resume.id_resume}>{resume.title_resume} — {resume.job_title}</option>)}</select></label><div className="analysis-optional-grid"><label>Entreprise<input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Facultatif" maxLength="160" /></label><label>Poste visé<input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="Facultatif" maxLength="160" /></label></div><section className="offer-url-import" aria-label="Import d’une offre publique"><label htmlFor="offer-url">Importer une offre depuis une URL</label><div><input id="offer-url" aria-label="URL publique de l’offre" type="url" value={offerUrl} onChange={(event) => setOfferUrl(event.target.value)} maxLength="2048" placeholder="https://…" /><Button type="button" onClick={importUrl} disabled={isImporting}>{isImporting ? 'Importation…' : 'Importer l’offre'}</Button></div><small>Seules les pages publiques accessibles sont essayées. Si le site bloque l’import, collez le texte ci-dessous.</small>{importedOffer && <p className="offer-url-import__notice" role="status">{importedOffer.warnings?.length ? 'Import partiel : ' + importedOffer.warnings.join(' ') : 'Informations détectées.'} Vérifiez les champs avant l’analyse.</p>}</section><label>Texte de l’offre<textarea value={jobDescription} onChange={updateJobDescription} rows="12" maxLength="20000" placeholder="Collez ici le texte complet de l’offre d’emploi…" /><small>{jobDescription.length} / 20 000 caractères</small></label><div className="offer-matching-action"><div><strong>Quel CV correspond le mieux à cette offre ?</strong><small>Comparaison estimative des compétences détectées, sans modifier vos CV.</small></div>{user?.plan === 'pro' ? <Button type="button" onClick={compareResumes} disabled={isMatching}>{isMatching ? 'Comparaison…' : 'Comparer mes CV'}</Button> : <p>Cette comparaison est incluse dans Novyata Pro.</p>}</div>{matching && <section className="resume-matching-results" aria-live="polite"><h2>Correspondance estimée</h2><p>{matching.note}{matching.skillsCompared ? ` Comparaison sur ${matching.skillsCompared} compétences reconnues.` : ''}</p>{matching.results.map((result) => <article key={result.resumeId}><header><div><strong>{result.title}</strong><small>{result.jobTitle}</small></div><b>{result.score === null ? 'Non estimable' : `${result.score}%`}</b></header><p>Présentes : {result.matchedSkills.length ? result.matchedSkills.join(', ') : 'aucune compétence reconnue'}</p><p>À vérifier : {result.missingSkills.length ? result.missingSkills.join(', ') : 'aucune détectée'}</p></article>)}</section>}{error && <p className="editor-feedback editor-feedback--error" role="alert">{error}</p>}<Button type="submit" disabled={isLoading}>{isLoading ? 'Analyse en cours…' : 'Analyser l’offre'}</Button></form>
    {analysis && <section className="analysis-results" aria-live="polite"><header><div><p>Résultat de l’analyse</p><h2>Correspondance estimée</h2>{analysis.scoreExplanation && <span className="analysis-score-explanation">{analysis.scoreExplanation}</span>}</div><strong>{analysis.matchScore}<small>%</small></strong></header><div className="analysis-result-grid"><article><h3><CheckCircle2 size={17} /> Correspondances solides</h3><MatchList items={analysis.strongMatches} emptyMessage="Aucune preuve forte identifiée." /></article><article><h3><FileSearch size={17} /> Présentes mais à préciser</h3><MatchList items={analysis.partialMatches} emptyMessage="Aucune correspondance partielle identifiée." /></article><article><h3><ScanSearch size={17} /> Manques importants</h3><MissingList items={analysis.importantMissingSkills} emptyMessage="Aucun manque important identifié." /></article><article><h3><Lightbulb size={17} /> Bonus manquants</h3><MissingList items={analysis.optionalMissingSkills} emptyMessage="Aucun bonus prioritaire manquant." /></article><article><h3><ScanSearch size={17} /> Mots-clés importants</h3><TagList items={analysis.importantKeywords} emptyMessage="Aucun mot-clé identifié." /></article><article><h3><Lightbulb size={17} /> Suggestions prioritaires</h3><ul>{analysis.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul></article></div><p className="analysis-safety-note">{analysis.safetyNote || 'N’ajoutez une compétence à votre CV que si vous la maîtrisez réellement.'}</p><div className="analysis-generation-action"><div><h3>Une lettre adaptée à cette offre</h3><p>Générez un brouillon à relire et modifier avant tout enregistrement.</p></div><Button type="button" onClick={createLetterDraft} disabled={isGenerating}>{isGenerating ? 'Génération…' : 'Générer une lettre de motivation'}</Button></div><p className="analysis-note">Ces recommandations sont informatives. L’application de suggestions au CV sera proposée ultérieurement.</p></section>}
    {generation && <section className="generated-letter-section"><header><div><p className="crumb">Brouillon généré</p><h2>Relisez votre lettre avant de l’enregistrer.</h2><p>Vous gardez le contrôle : modifiez librement le contenu, puis enregistrez-le dans vos lettres.</p></div></header><div className="generated-letter-layout"><div className="generated-letter-form"><label>Objet<input aria-label="Objet de la lettre" value={generation.subject} onChange={(event) => setGeneration((current) => ({ ...current, subject: event.target.value }))} /></label><label>Contenu<textarea aria-label="Contenu de la lettre" value={generation.content} onChange={(event) => setGeneration((current) => ({ ...current, content: event.target.value }))} rows="16" /><small>{letterWordCount(generation.content)} mots · {letterCharacterCount(generation.content)} caractères</small></label><Button type="button" onClick={saveGeneratedLetter} disabled={isSaving}>{isSaving ? 'Enregistrement…' : 'Enregistrer dans mes lettres'}</Button></div><aside><p className="resume-preview-label">Aperçu A4 en direct</p><CoverLetterPreview letter={{ subject: generation.subject, content: generation.content, company_name: companyName, job_title: jobTitle, template: 'classic' }} resume={selectedResume} user={user} /></aside></div></section>}
  </main>
}
