import { Download, FileText, ScrollText, ClipboardList, HelpCircle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader.jsx';

const GUIDELINES = [
  {
    icon: <ScrollText size={20} />,
    title: 'Document Request Guidelines',
    description: 'How requests are submitted, reviewed, endorsed, processed, and released.',
    file: '/templates/clear-document-request-guidelines.txt',
  },
  {
    icon: <FileText size={20} />,
    title: 'Request Form Template',
    description: 'A fill-in template you can paste into the description of any request.',
    file: '/templates/clear-request-form-template.txt',
  },
  {
    icon: <ClipboardList size={20} />,
    title: 'Endorsement Checklist',
    description: 'Professor and admin checklists for recording correct decisions.',
    file: '/templates/clear-endorsement-checklist.txt',
  },
  {
    icon: <HelpCircle size={20} />,
    title: 'FAQ',
    description: 'Answers to the most common questions about tracking requests.',
    file: '/templates/clear-faq.txt',
  },
];

export function GuidelinesPage() {
  return (
    <div className="dashboard-stack">
      <PageHeader
        eyebrow="Resources"
        title="Guidelines & Templates"
        description="Reference documents for submitting, reviewing, and releasing requests. Each file downloads as plain text."
      />

      <section className="content-panel" aria-label="Guideline documents">
        <ul className="guideline-list">
          {GUIDELINES.map((item) => (
            <li className="guideline-row" key={item.title}>
              <span className="guideline-row__icon">{item.icon}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
              <a className="button button--dark button--small" href={item.file} download>
                <Download size={16} /> Download
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
