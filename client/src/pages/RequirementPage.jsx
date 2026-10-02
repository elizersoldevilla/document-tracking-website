import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, FileText, Send, Trash2, Upload } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { LoadingState } from '../components/LoadingState.jsx';
import { Notice } from '../components/Notice.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { formatDate, formatFileSize } from '../utils/presentation.js';
import { REQUIREMENTS } from '../utils/requirements.js';

const CHECKLIST_LEFT = REQUIREMENTS.slice(0, 3);
const CHECKLIST_RIGHT = REQUIREMENTS.slice(3);
const FILE_ACCEPT = [
  'application/pdf',
  'image/*',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.txt',
  '.csv',
  '.md',
  '.rtf',
  '.zip',
].join(',');

function readDraft(key) {
  try {
    return window.localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function saveDraft(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private modes; drafts are optional.
  }
}

function clearDraft(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

function requirementLabel(slug) {
  const match = REQUIREMENTS.find((item) => item.slug === slug);
  return match ? match.title : slug;
}

export function RequirementPage() {
  const { id } = useParams();

  const [request, setRequest] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState(null);

  const [checked, setChecked] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [comments, setComments] = useState(() => readDraft(`clear:req-comments:${id}`));
  const [otherName, setOtherName] = useState(() => readDraft(`clear:req-other:${id}`));
  const [pickedFile, setPickedFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const fileInputRef = useRef(null);
  const bootstrappedRef = useRef(false);

  // Loads the request plus its uploaded files. After the first load the
  // checklist mirrors exactly the requirements that already have a file
  // attached; later refreshes keep whatever the student ticked.
  const load = useCallback(async () => {
    const [documentRecord, documentFiles] = await Promise.all([
      api.document(id),
      api.documentFiles(id),
    ]);

    setRequest(documentRecord);
    setFiles(documentFiles);

    if (!bootstrappedRef.current) {
      bootstrappedRef.current = true;
      setTeamName(documentRecord.researchTeamName || '');
      const attached = new Set(documentFiles.map((file) => file.requirementSlug));
      setChecked(
        REQUIREMENTS.filter((item) => attached.has(item.slug)).map((item) => item.slug),
      );
    }

    setLoadError('');
    return documentFiles;
  }, [id]);

  useEffect(() => {
    let active = true;

    bootstrappedRef.current = false;
    setLoading(true);
    setLoadError('');
    setNotice(null);
    setChecked([]);
    setTeamName('');
    setComments(readDraft(`clear:req-comments:${id}`));
    setOtherName(readDraft(`clear:req-other:${id}`));
    setPickedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    load()
      .catch((error) => {
        if (active) setLoadError(error.message || 'This request could not be found.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, load]);

  const toggleSlug = (slug) => {
    setChecked((current) => (current.includes(slug)
      ? current.filter((item) => item !== slug)
      : [...current, slug]));
  };

  const handleComments = (event) => {
    setComments(event.target.value);
    saveDraft(`clear:req-comments:${id}`, event.target.value);
  };

  const handleOtherName = (event) => {
    setOtherName(event.target.value);
    saveDraft(`clear:req-other:${id}`, event.target.value);
  };

  const handlePick = (event) => {
    setPickedFile(event.target.files?.[0] || null);
    // Allow picking the same file again later.
    event.target.value = '';
  };

  const handleDelete = async (file) => {
    setNotice(null);
    try {
      await api.deleteFile(file.id);
      setFiles((current) => current.filter((item) => item.id !== file.id));
      setNotice({ type: 'success', message: `${file.originalName} was removed.` });
    } catch (error) {
      setNotice({ type: 'error', message: error.message });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setNotice(null);

    if (checked.length === 0) {
      setNotice({ type: 'error', message: 'Select at least one document to upload.' });
      return;
    }

    if (checked.includes('other-document') && !otherName.trim()) {
      setNotice({ type: 'error', message: 'Enter the name of your other document.' });
      return;
    }

    const trimmedTeam = teamName.trim();
    if (trimmedTeam.length > 0 && trimmedTeam.length < 3) {
      setNotice({
        type: 'error',
        message: 'Research Team Name must be at least 3 characters, or leave it empty.',
      });
      return;
    }

    const attachedSlugs = new Set(files.map((file) => file.requirementSlug));
    const missingSlugs = checked.filter((slug) => !attachedSlugs.has(slug));
    if (!pickedFile && missingSlugs.length > 0) {
      setNotice({ type: 'error', message: 'Choose a file to submit.' });
      return;
    }

    setBusy(true);
    try {
      if (trimmedTeam !== (request.researchTeamName || '').trim()) {
        await api.updateDocument(id, { researchTeamName: trimmedTeam || null });
      }

      if (pickedFile) {
        // Requirements without a file yet only receive the new upload; when
        // everything ticked is already on file the upload is a revision, so it
        // goes to every ticked requirement.
        const uploadSlugs = missingSlugs.length > 0 ? missingSlugs : checked;
        for (const slug of uploadSlugs) {
          await api.uploadFile(id, { requirementSlug: slug, file: pickedFile });
        }
        setPickedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setFiles(await api.documentFiles(id));
      }

      const comment = comments.trim();
      if (comment) {
        await api.sendMessage(id, { body: comment });
        clearDraft(`clear:req-comments:${id}`);
        setComments('');
      }

      await load();
      setNotice({
        type: 'success',
        message: 'Your required documents were submitted for review.',
      });
    } catch (error) {
      const teamError = error.errors?.researchTeamName;
      setNotice({
        type: 'error',
        message: teamError ? `Research Team Name: ${teamError}` : error.message,
      });
    } finally {
      setBusy(false);
    }
  };

  const renderCheckItem = (item) => {
    const isOther = item.slug === 'other-document';
    const isChecked = checked.includes(item.slug);

    if (!isOther) {
      return (
        <label className="req-docs__check" key={item.slug}>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => toggleSlug(item.slug)}
          />
          <span>{item.title}</span>
        </label>
      );
    }

    return (
      <div className="req-docs__check req-docs__check--other" key={item.slug}>
        <label className="req-docs__check">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => toggleSlug(item.slug)}
          />
          <span>Other Document:</span>
        </label>
        <input
          className="req-docs__other"
          type="text"
          value={otherName}
          onChange={handleOtherName}
          placeholder="Document name"
          maxLength={120}
          aria-label="Other document name"
        />
      </div>
    );
  };

  return (
    <div className="form-page">
      <Link className="back-link" to="/">
        <ArrowLeft size={17} strokeWidth={2.5} />
        Back to requests
      </Link>

      <PageHeader eyebrow="New submission" title="Required Documents" />

      <section className="form-card req-docs">
        {loading ? (
          <LoadingState rows={4} />
        ) : loadError || !request ? (
          <Notice type="error" message={loadError || 'This request could not be found.'} />
        ) : (
          <form className="form-stack" onSubmit={handleSubmit} noValidate>
            <Notice
              type={notice?.type || 'info'}
              message={notice?.message}
              onDismiss={() => setNotice(null)}
            />

            <fieldset className="req-docs__fieldset">
              <legend>Documents:</legend>
              <div className="req-docs__cols">
                <div className="req-docs__col">
                  {CHECKLIST_LEFT.map(renderCheckItem)}
                </div>
                <div className="req-docs__col">
                  {CHECKLIST_RIGHT.map(renderCheckItem)}
                </div>
              </div>
            </fieldset>

            <label className="field">
              <span>Research Team Name:</span>
              <input
                name="researchTeamName"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                maxLength={120}
                placeholder='Example: Dela Cruz et al. | "Research Title"'
                autoComplete="off"
              />
              <small>{teamName.length}/120</small>
            </label>

            <label className="field">
              <span>Comments:</span>
              <textarea
                className="req-docs__comments"
                value={comments}
                onChange={handleComments}
                maxLength={2000}
                rows={9}
                placeholder="Explain what you need, the intended purpose, deadline, and any relevant details."
              />
              <small>{comments.length}/2000</small>
            </label>

            <div className="req-docs__bottom">
              <div className="req-docs__upload">
                <p className="req-docs__label">Download file here: in pdf</p>
                <button
                  type="button"
                  className={`req-docs__file-box${pickedFile ? ' has-file' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={15} aria-hidden="true" />
                  <span>{pickedFile ? pickedFile.name : 'Choose a file'}</span>
                  {pickedFile && (
                    <span className="req-docs__file-size">{formatFileSize(pickedFile.size)}</span>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept={FILE_ACCEPT}
                  onChange={handlePick}
                />
                <p className="req-docs__file-hint">
                  {pickedFile
                    ? `This file will be submitted for ${checked.length} selected document${checked.length === 1 ? '' : 's'}.`
                    : 'PDF, image, Office, text, or zip file — up to 10 MB.'}
                </p>

                {files.length > 0 && (
                  <ul className="file-list">
                    {files.map((file) => (
                      <li className="file-list__item" key={file.id}>
                        <FileText size={16} className="file-list__icon" />
                        <span className="file-list__meta">
                          <strong>{file.originalName}</strong>
                          <small>
                            {requirementLabel(file.requirementSlug)}
                            {' · '}
                            {formatFileSize(file.sizeBytes)}
                            {' · uploaded '}
                            {formatDate(file.uploadedAt, { includeTime: true })}
                          </small>
                        </span>
                        <a className="file-list__action" href={api.fileHref(file.id)}>Download</a>
                        <button
                          type="button"
                          className="file-list__action file-list__action--danger"
                          disabled={busy}
                          onClick={() => handleDelete(file)}
                        >
                          <Trash2 size={13} />
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="req-docs__actions">
                <p className="req-docs__caption">Submit Documents</p>
                <div className="form-actions">
                  <Link className="button button--ghost" to="/">Cancel</Link>
                  <button className="button button--dark" type="submit" disabled={busy}>
                    {busy ? 'Submitting…' : 'Submit request'}
                    {!busy && <Send size={16} aria-hidden="true" />}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
