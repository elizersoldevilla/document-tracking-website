import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Send, UserRoundCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { LoadingState } from '../components/LoadingState.jsx';
import { Notice } from '../components/Notice.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

export function NewRequestPage() {
  const navigate = useNavigate();
  const [professors, setProfessors] = useState([]);
  const [loadingProfessors, setLoadingProfessors] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ professorId: '', title: '', researchTeamName: '', description: '' });

  useEffect(() => {
    let active = true;
    api.professors()
      .then((result) => {
        if (active) setProfessors(result);
      })
      .catch((error) => {
        if (active) setLoadError(error.message);
      })
      .finally(() => {
        if (active) setLoadingProfessors(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    setFieldErrors({});
    try {
      const document = await api.createDocument({
        professorId: Number(form.professorId),
        title: form.title,
        description: form.description,
        researchTeamName: form.researchTeamName.trim() || undefined,
      });
      navigate(`/documents/${document.id}`, {
        state: { message: 'Your request was submitted successfully.' },
      });
    } catch (error) {
      setSubmitError(error.message);
      setFieldErrors(error.errors || {});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="form-page">
      <Link className="back-link" to="/"><ArrowLeft size={17} /> Back to requests</Link>
      <PageHeader
        eyebrow="New submission"
        title="Request a document"
        description="Choose the responsible professor and provide a clear description of the document or requirement you need."
      />

      <div className="form-layout">
        <section className="form-card">
          {loadingProfessors ? <LoadingState rows={2} /> : (
            <>
              <Notice type="error" message={loadError || submitError} onDismiss={() => {
                setLoadError('');
                setSubmitError('');
              }} />
              <form className="form-stack" onSubmit={handleSubmit} noValidate>
                <label className="field">
                  <span>Selected professor</span>
                  <select name="professorId" value={form.professorId} onChange={updateField} required>
                    <option value="">Choose a professor</option>
                    {professors.map((professor) => (
                      <option value={professor.id} key={professor.id}>{professor.name} — {professor.email}</option>
                    ))}
                  </select>
                  {fieldErrors.professorId && <small className="field__error">{fieldErrors.professorId}</small>}
                </label>
                <label className="field">
                  <span>Document title</span>
                  <input
                    name="title"
                    value={form.title}
                    onChange={updateField}
                    placeholder="Example: Certificate of good moral character"
                    minLength="3"
                    maxLength="120"
                    required
                  />
                  <small className={fieldErrors.title ? 'field__error' : ''}>{fieldErrors.title || `${form.title.length}/120`}</small>
                </label>
                <label className="field">
                  <span>Research Team Name</span>
                  <input
                    name="researchTeamName"
                    value={form.researchTeamName}
                    onChange={updateField}
                    placeholder="Example: Dela Cruz et al 'Research Title'"
                    maxLength="120"
                  />
                  <small className={fieldErrors.researchTeamName ? 'field__error' : ''}>
                    {fieldErrors.researchTeamName || `${form.researchTeamName.length}/120`}
                  </small>
                </label>
                <label className="field">
                  <span>Description and requirements</span>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={updateField}
                    placeholder="Explain what you need, the intended purpose, deadline, and any relevant details."
                    rows="8"
                    minLength="10"
                    maxLength="2000"
                    required
                  />
                  <small className={fieldErrors.description ? 'field__error' : ''}>
                    {fieldErrors.description || `${form.description.length}/2000`}
                  </small>
                </label>
                <div className="form-actions">
                  <Link className="button button--ghost" to="/">Cancel</Link>
                  <button className="button button--dark" type="submit" disabled={submitting || professors.length === 0}>
                    {submitting ? 'Submitting…' : <>Submit request <Send size={18} /></>}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>

        <aside className="guidance-card">
          <span className="guidance-card__icon"><UserRoundCheck size={24} /></span>
          <h2>What happens next?</h2>
          <ol>
            <li><span>1</span><p>Your selected professor reviews the request.</p></li>
            <li><span>2</span><p>They approve it or endorse it to the admin office.</p></li>
            <li><span>3</span><p>Administration processes the endorsed request and prepares it for pickup.</p></li>
          </ol>
          <div className="guidance-card__tip">
            <ArrowRight size={17} />
            <p>Use a specific title and mention deadlines or required document formats.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
