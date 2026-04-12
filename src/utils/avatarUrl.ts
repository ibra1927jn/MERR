/** Base URL para el servicio de avatares generados por UI Avatars */
const AVATAR_BASE = 'https://ui-avatars.com/api/';

/** Genera una URL de avatar con nombre y opciones opcionales de fondo/color */
export function avatarUrl(
  name: string,
  options?: { background?: string; color?: string }
): string {
  const params = new URLSearchParams({ name });
  if (options?.background) params.set('background', options.background);
  else params.set('background', 'random');
  if (options?.color) params.set('color', options.color);
  return `${AVATAR_BASE}?${params.toString()}`;
}
