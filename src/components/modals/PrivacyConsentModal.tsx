/**
 * PrivacyConsentModal — NZ Privacy Act 2020 Compliance
 *
 * Ineludible modal shown on first login if the user has not yet
 * accepted the privacy consent. Cannot be dismissed without explicit
 * acceptance. Required by the NZ Privacy Act 2020 for collection of
 * personal and biometric harvest data from workers (including migrant
 * workers under RSE scheme).
 *
 * @module components/modals/PrivacyConsentModal
 * @see https://www.legislation.govt.nz/act/public/2020/0031/latest/LMS23223.html
 */
import React, { useState, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { logger } from '@/utils/logger';
import { i18n } from '@/services/i18n.service';

interface PrivacyConsentModalProps {
  /** The authenticated user's ID (from auth.users) */
  userId: string;
  /** The user's role — determines if pickers table also needs updating */
  userRole: string;
  /** Called after successful consent recording */
  onConsentGiven: () => void;
}

/**
 * Returns the consent sections based on current language.
 * Each section maps to a specific NZ Privacy Act 2020 Information Privacy Principle (IPP).
 */
function getConsentSections(): Array<{ title: string; body: string }> {
  const t = (key: string) => i18n.t(key);
  return [
    {
      title: t('privacy.section1.title'),
      body: t('privacy.section1.body'),
    },
    {
      title: t('privacy.section2.title'),
      body: t('privacy.section2.body'),
    },
    {
      title: t('privacy.section3.title'),
      body: t('privacy.section3.body'),
    },
    {
      title: t('privacy.section4.title'),
      body: t('privacy.section4.body'),
    },
    {
      title: t('privacy.section5.title'),
      body: t('privacy.section5.body'),
    },
    {
      title: t('privacy.section6.title'),
      body: t('privacy.section6.body'),
    },
  ];
}

const PrivacyConsentModal: React.FC<PrivacyConsentModalProps> = ({
  userId,
  userRole,
  onConsentGiven,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const t = useCallback((key: string) => i18n.t(key), []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    // Consider "scrolled to bottom" if within 20px of the end
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
    if (atBottom) {
      setHasScrolledToBottom(true);
    }
  }, []);

  const handleAccept = useCallback(async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const now = new Date().toISOString();

      // 1. Update public.users with consent timestamp
      const { error: userError } = await supabase
        .from('users')
        .update({ privacy_consent_at: now })
        .eq('id', userId);

      if (userError) {
        logger.error('[PrivacyConsent] Failed to update users table:', userError);
        throw new Error(t('privacy.error'));
      }

      // 2. If the user is associated with a picker record, update that too
      if (['runner', 'team_leader', 'manager'].includes(userRole)) {
        // Pickers are separate entities — update if they have a matching record
        await supabase.from('pickers').update({ privacy_consent_at: now }).eq('user_id', userId);
        // Non-critical: pickers may not have a user_id link
      }

      logger.info(`[PrivacyConsent] Consent recorded for user ${userId} at ${now}`);
      onConsentGiven();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('privacy.error');
      setError(message);
      logger.error('[PrivacyConsent] Error recording consent:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, userRole, onConsentGiven, t]);

  const sections = getConsentSections();

  return (
    <div
      data-testid="privacy-consent-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-consent-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface, #1e1e2e)',
          borderRadius: '16px',
          padding: '28px',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          border: '1px solid var(--color-border, #333)',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '16px', flexShrink: 0 }}>
          <h2
            id="privacy-consent-title"
            style={{
              color: 'var(--color-text, #fff)',
              marginTop: 0,
              marginBottom: '8px',
              fontSize: '20px',
              fontWeight: 700,
            }}
          >
            🔐 {t('privacy.title')}
          </h2>
          <p
            style={{
              color: 'var(--color-text-muted, #aaa)',
              fontSize: '13px',
              lineHeight: '1.5',
              margin: 0,
            }}
          >
            {t('privacy.subtitle')}
          </p>
        </div>

        {/* Scrollable content */}
        <div
          data-testid="privacy-consent-content"
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowY: 'auto',
            marginBottom: '16px',
            paddingRight: '8px',
            minHeight: 0,
          }}
        >
          {sections.map((section, idx) => (
            <div key={idx} style={{ marginBottom: '16px' }}>
              <h3
                style={{
                  color: 'var(--color-text, #fff)',
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '6px',
                  marginTop: 0,
                }}
              >
                {section.title}
              </h3>
              <p
                style={{
                  color: 'var(--color-text-muted, #bbb)',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  margin: 0,
                  whiteSpace: 'pre-line',
                }}
              >
                {section.body}
              </p>
            </div>
          ))}

          {/* Legal reference */}
          <div
            style={{
              borderTop: '1px solid var(--color-border, #444)',
              paddingTop: '12px',
              marginTop: '8px',
            }}
          >
            <p
              style={{
                color: '#888',
                fontSize: '11px',
                lineHeight: '1.5',
                margin: 0,
              }}
            >
              {t('privacy.legalRef')}
            </p>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <p
            role="alert"
            style={{
              color: '#ff6b6b',
              fontSize: '13px',
              margin: '0 0 12px 0',
            }}
          >
            ❌ {error}
          </p>
        )}

        {/* Accept button */}
        <button
          data-testid="privacy-consent-accept"
          type="button"
          onClick={handleAccept}
          disabled={isSubmitting || !hasScrolledToBottom}
          aria-label={t('privacy.acceptButton')}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: isSubmitting || !hasScrolledToBottom ? '#555' : '#4CAF50',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: isSubmitting || !hasScrolledToBottom ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
            flexShrink: 0,
          }}
        >
          {isSubmitting
            ? `⏳ ${t('privacy.submitting')}`
            : !hasScrolledToBottom
              ? `↓ ${t('privacy.scrollToRead')}`
              : `✅ ${t('privacy.acceptButton')}`}
        </button>

        {/* Footer notice */}
        <p
          style={{
            color: '#666',
            fontSize: '11px',
            marginTop: '12px',
            textAlign: 'center',
            marginBottom: 0,
          }}
        >
          {t('privacy.footer')}
        </p>
      </div>
    </div>
  );
};

export default PrivacyConsentModal;
