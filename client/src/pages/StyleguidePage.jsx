import { useEffect, useState } from 'react';
import { ClearIcon } from '../components/ClearIcon.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

const SWATCHES = [
  { token: '--lime', label: 'CLEAR green' },
  { token: '--lime-dark', label: 'Green hover' },
  { token: '--lime-soft', label: 'Green soft' },
  { token: '--ink', label: 'Charcoal' },
  { token: '--beige', label: 'Beige' },
  { token: '--paper', label: 'Cream card' },
  { token: '--paper-deep', label: 'Cream deep' },
  { token: '--white', label: 'White' },
];

export function StyleguidePage() {
  const [colors, setColors] = useState({});

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const values = {};
    SWATCHES.forEach(({ token }) => {
      values[token] = styles.getPropertyValue(token).trim();
    });
    setColors(values);
  }, []);

  return (
    <div className="dashboard-stack">
      <PageHeader
        eyebrow="Design"
        title="Styleguide"
        description="Brand colors and typography read live from client/src/styles/index.css."
      />

      <section className="content-panel" aria-labelledby="colors-title">
        <div className="section-heading section-heading--compact">
          <div>
            <p className="eyebrow">Tokens</p>
            <h2 id="colors-title">Colors</h2>
          </div>
        </div>
        <div className="swatch-grid">
          {SWATCHES.map(({ token, label }) => (
            <div className="swatch" key={token}>
              <span className="swatch__chip" style={{ background: `var(${token})` }} />
              <div>
                <strong>{label}</strong>
                <code>{token}: {colors[token] || '…'}</code>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="content-panel" aria-labelledby="type-title">
        <div className="section-heading section-heading--compact">
          <div>
            <p className="eyebrow">Typography</p>
            <h2 id="type-title">Type scale</h2>
          </div>
        </div>
        <div className="type-samples">
          <p className="type-sample type-sample--display">Poppins 800 — CLEAR wordmark</p>
          <p className="type-sample type-sample--h1">Poppins 700 — Page heading</p>
          <p className="type-sample type-sample--h2">Poppins 700 — Section heading</p>
          <p className="type-sample type-sample--body">Helvetica Neue — Body copy for descriptions, tables, and form text.</p>
          <p className="type-sample type-sample--eyebrow">Poppins 800 uppercase — EYEBROW LABEL</p>
        </div>
      </section>

      <section className="content-panel" aria-labelledby="icon-title">
        <div className="section-heading section-heading--compact">
          <div>
            <p className="eyebrow">Identity</p>
            <h2 id="icon-title">CLEAR mark</h2>
          </div>
        </div>
        <div className="mark-samples">
          <span className="mark-sample mark-sample--green"><ClearIcon size={72} /></span>
          <span className="mark-sample mark-sample--charcoal"><ClearIcon size={72} /></span>
          <span className="mark-sample mark-sample--cream"><ClearIcon size={72} /></span>
        </div>
      </section>
    </div>
  );
}
