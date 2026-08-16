export const SUPPORT_EMAIL = 'thataibuddy3@gmail.com';

/**
 * Prefills subject and browser/OS info so bug reports are easier to triage
 * without asking the user to dig that up themselves.
 */
export function buildSupportMailto(subject = 'PouchLM Support', extraDetails?: string): string {
  const body = [
    'Please describe what happened below.',
    '',
    '---',
    `Browser: ${navigator.userAgent}`,
    ...(extraDetails ? [`Detail: ${extraDetails}`] : []),
  ].join('\r\n');
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const SUPPORT_BLURB = `Still stuck? Email ${SUPPORT_EMAIL}. We usually respond within 24 hours.`;
