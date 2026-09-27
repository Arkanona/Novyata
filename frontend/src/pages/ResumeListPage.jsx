import { CirclePlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/common/Button'
import ResumeEmptyState from '../components/resume/ResumeEmptyState'

export default function ResumeListPage() { return <div className="app-page"><header className="app-header"><div><p className="crumb">Vos documents</p><h1>Mes CV</h1></div><Link to="/cv/nouveau"><Button><CirclePlus size={17} /> Nouveau CV</Button></Link></header><ResumeEmptyState /></div> }
