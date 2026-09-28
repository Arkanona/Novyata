import Button from '../common/Button'

export default function PersonalInfoForm({ form, errors, isSaving, onChange, onSubmit }) {
  return <form className="personal-info-form" onSubmit={onSubmit} noValidate>
    <div className="editor-form-heading"><p>Informations personnelles</p><h1>Présentez-vous avec clarté.</h1><span>Ces informations sont affichées directement dans votre CV.</span></div>
    <div className="editor-field-grid"><label>Prénom<input name="first_name" value={form.first_name} onChange={onChange} autoComplete="given-name" aria-invalid={Boolean(errors.first_name)} />{errors.first_name && <small>{errors.first_name}</small>}</label><label>Nom<input name="last_name" value={form.last_name} onChange={onChange} autoComplete="family-name" aria-invalid={Boolean(errors.last_name)} />{errors.last_name && <small>{errors.last_name}</small>}</label></div>
    <label>Poste recherché<input name="job_title" value={form.job_title} onChange={onChange} placeholder="Ex. Product Designer" aria-invalid={Boolean(errors.job_title)} />{errors.job_title && <small>{errors.job_title}</small>}</label>
    <div className="editor-field-grid"><label>Adresse e-mail<input type="email" name="email" value={form.email} onChange={onChange} autoComplete="email" aria-invalid={Boolean(errors.email)} />{errors.email && <small>{errors.email}</small>}</label><label>Téléphone<input type="tel" name="phone" value={form.phone} onChange={onChange} autoComplete="tel" aria-invalid={Boolean(errors.phone)} />{errors.phone && <small>{errors.phone}</small>}</label></div>
    <label>Ville<input name="city" value={form.city} onChange={onChange} autoComplete="address-level2" aria-invalid={Boolean(errors.city)} />{errors.city && <small>{errors.city}</small>}</label>
    <label>Présentation<textarea name="summary" value={form.summary} onChange={onChange} rows="6" placeholder="Présentez votre parcours, vos atouts et ce que vous recherchez." aria-invalid={Boolean(errors.summary)} />{errors.summary && <small>{errors.summary}</small>}</label>
    <Button type="submit" disabled={isSaving}>{isSaving ? 'Enregistrement…' : 'Enregistrer'}</Button>
  </form>
}
