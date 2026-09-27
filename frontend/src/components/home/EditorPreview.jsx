import { Check, FileText, UserRound } from 'lucide-react'

export default function EditorPreview() {
  return <div className="editor-demo" id="exemple" aria-label="Aperçu illustratif de l'éditeur de CV">
    <div className="editor-demo-top"><span className="editor-demo-brand">n</span><span>Product Designer</span><i>Enregistré</i></div>
    <div className="editor-demo-body"><aside className="editor-demo-form"><p>Modifier votre CV</p><button className="selected"><UserRound size={13} /> Informations</button><button><FileText size={13} /> Expériences</button><button><FileText size={13} /> Formation</button><div className="demo-fields"><span>Prénom et nom</span><b>Marie Laurent</b><span>Poste recherché</span><b>Product Designer</b><span>À propos</span><b className="demo-text">Designer engagée, attentive aux usages et aux personnes.</b></div></aside>
      <article className="editor-demo-paper"><header><div><h2>MARIE<br />LAURENT</h2><p>Product Designer</p></div><small>Paris, France<br />marie@email.com</small></header><section><h3>Profil</h3><p>Designer produit avec 6 ans d'expérience dans la conception de services numériques utiles et accessibles.</p></section><section><h3>Expériences</h3><div><b>Product Designer</b><small>Qonto · 2022 — Aujourd’hui</small><p>Conception des parcours d'onboarding et amélioration continue des produits.</p></div><div><b>UX Designer</b><small>Back Market · 2019 — 2022</small></div></section><section><h3>Compétences</h3><p>Figma · Recherche utilisateur · Design system</p></section></article>
    </div><div className="editor-demo-note"><Check size={14} /> Prêt à envoyer</div>
  </div>
}
