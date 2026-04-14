import type { Locale, TranslationDict } from '../types';
import en from './en';
import es from './es';
import mi from './mi';
import sm from './sm';
import hi from './hi';
import to from './to';
import tl from './tl';

export const translations: Record<Locale, TranslationDict> = { en, es, mi, sm, hi, to, tl };
