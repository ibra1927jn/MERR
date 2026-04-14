/**
 * money.ts — Utilidades para inputs monetarios
 *
 * Garantiza que los inputs numéricos de dinero siempre usen '.' como separador decimal,
 * independiente del locale del navegador o del idioma seleccionado en la app.
 *
 * Esto previene el bug §6 donde ES locale mostraba "6,5" en lugar de "6.5"
 * en inputs de tipo number.
 */

/**
 * Normaliza un string de valor monetario: reemplaza comas por puntos,
 * elimina caracteres no numéricos salvo el punto decimal y signo negativo.
 */
export function normalizeMoney(raw: string): string {
    return raw.replace(',', '.').replace(/[^0-9.-]/g, '');
}

/**
 * Parsea un string monetario a float usando '.' como separador.
 * Retorna 0 si el valor no es un número válido.
 */
export function parseMoney(raw: string): number {
    const normalized = normalizeMoney(raw);
    const value = parseFloat(normalized);
    return isNaN(value) ? 0 : value;
}

/**
 * Formatea un número para mostrar en un input monetario.
 * Siempre usa '.' como separador decimal — nunca Intl (que usaría locale).
 */
export function formatMoneyInput(value: number, decimals = 2): string {
    return value.toFixed(decimals);
}
