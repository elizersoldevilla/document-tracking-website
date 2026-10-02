import { Check, Clock3 } from 'lucide-react';
import { getCurrentTimelineIndex, TIMELINE_STEPS } from '../utils/presentation.js';

export function ProgressTracker({ status }) {
  const currentIndex = getCurrentTimelineIndex(status);
  const progress = currentIndex === 0 ? 0 : (currentIndex / (TIMELINE_STEPS.length - 1)) * 100;

  return (
    <section className="tracker" aria-labelledby="tracker-title">
      <div className="section-heading section-heading--compact">
        <div>
          <p className="eyebrow">Live progress</p>
          <h2 id="tracker-title">Request timeline</h2>
        </div>
        <span className="live-indicator"><span /> Live</span>
      </div>

      <div className="tracker__track" style={{ '--progress': `${progress}%` }}>
        {TIMELINE_STEPS.map((step, index) => {
          const complete = index < currentIndex || status === 'COMPLETED';
          const current = index === currentIndex && status !== 'COMPLETED';
          const state = complete ? 'complete' : current ? 'current' : 'upcoming';
          const Icon = complete ? Check : current ? Clock3 : null;

          return (
            <div className={`tracker__step tracker__step--${state}`} key={step.key}>
              <div className="tracker__node" aria-hidden="true">
                {Icon ? <Icon size={14} strokeWidth={3} /> : <span>{index + 1}</span>}
              </div>
              <span className="tracker__label">{step.shortLabel}</span>
            </div>
          );
        })}
      </div>

      {status === 'SIGNED_APPROVED' && (
        <p className="tracker__note">Professor sign-off is recorded. The request can now be endorsed to the admin office.</p>
      )}
      {status === 'COMPLETED' && (
        <p className="tracker__note">This request is complete. No further action is required.</p>
      )}
    </section>
  );
}
