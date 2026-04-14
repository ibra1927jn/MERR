/**
 * pluralize.ts — Utilidad de pluralización para harvestpro-nz
 * Soporta formas singular/plural simples para EN y ES.
 * Para i18n complejo, usar formatMessage con ICU directamente.
 */

export type SupportedLocale = 'en' | 'es' | 'mi' | 'sm' | 'hi' | 'to' | 'tl';

/**
 * Retorna la forma correcta según count para locales con reglas simples (1 = singular, resto = plural).
 * @param count - número a evaluar
 * @param singular - forma singular (en español: "1 persona")
 * @param plural - forma plural (en español: "3 personas")
 */
export function plural(count: number, singular: string, plural: string): string {
    return count === 1 ? singular : plural;
}

/**
 * formatPeople — "N person/persons" en EN, "N persona/personas" en ES
 */
export function formatPeople(count: number, locale: SupportedLocale = 'en'): string {
    if (locale === 'es') {
        return count === 1 ? `${count} persona` : `${count} personas`;
    }
    return count === 1 ? `${count} person` : `${count} people`;
}

/**
 * formatBins — "N bin/bins" en EN, "N cubeta/cubetas" en ES
 */
export function formatBins(count: number, locale: SupportedLocale = 'en'): string {
    if (locale === 'es') {
        return count === 1 ? `${count} cubeta` : `${count} cubetas`;
    }
    return count === 1 ? `${count} bin` : `${count} bins`;
}

/**
 * formatPickers — "N picker/pickers" en EN, "N recolector/recolectores" en ES
 */
export function formatPickers(count: number, locale: SupportedLocale = 'en'): string {
    if (locale === 'es') {
        return count === 1 ? `${count} recolector` : `${count} recolectores`;
    }
    return count === 1 ? `${count} picker` : `${count} pickers`;
}
