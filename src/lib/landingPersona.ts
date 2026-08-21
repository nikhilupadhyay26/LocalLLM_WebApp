export type LandingPersona = 'business' | 'students';

const PERSONA_STORAGE_KEY = 'pouchlm_landing_persona';

export function getStoredPersona(): LandingPersona | null {
  const value = localStorage.getItem(PERSONA_STORAGE_KEY);
  return value === 'business' || value === 'students' ? value : null;
}

export function setStoredPersona(persona: LandingPersona): void {
  localStorage.setItem(PERSONA_STORAGE_KEY, persona);
}

export function clearStoredPersona(): void {
  localStorage.removeItem(PERSONA_STORAGE_KEY);
}
