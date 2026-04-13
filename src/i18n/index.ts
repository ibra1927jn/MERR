/**
 * i18n — Lightweight Internationalization for HarvestPro NZ
 *
 * Supports 3 locales:
 *   - en (English) — default
 *   - es (Español) — for Spanish-speaking workers
 *   - mi (Te Reo Māori) — for NZ indigenous language support
 *
 * Uses React Context for simplicity — no external dependencies needed.
 * Translation keys follow a namespace.key pattern for organization.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type Locale = 'en' | 'es' | 'mi' | 'sm' | 'hi' | 'to' | 'tl';

export interface LocaleInfo {
    code: Locale;
    label: string;
    nativeName: string;
    flag: string;
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
    { code: 'en', label: 'English',          nativeName: 'English',       flag: '🇳🇿' },
    { code: 'es', label: 'Spanish',          nativeName: 'Español',       flag: '🇪🇸' },
    { code: 'mi', label: 'Māori',            nativeName: 'Te Reo Māori',  flag: '🇳🇿' },
    { code: 'sm', label: 'Samoan',           nativeName: 'Gagana Samoa',  flag: '🇼🇸' },
    { code: 'hi', label: 'Hindi',            nativeName: 'हिन्दी',           flag: '🇮🇳' },
    { code: 'to', label: 'Tongan',           nativeName: 'Lea Faka-Tonga',flag: '🇹🇴' },
    { code: 'tl', label: 'Filipino/Tagalog', nativeName: 'Filipino',      flag: '🇵🇭' },
];

// ─── Translation dictionaries ────────────────────────────────
type TranslationDict = Record<string, string>;

const translations: Record<Locale, TranslationDict> = {
    en: {
        // ── Navigation ──
        'nav.dashboard': 'Dashboard',
        'nav.teams': 'Teams',
        'nav.orchard_map': 'Orchard Map',
        'nav.logistics': 'Logistics',
        'nav.insights': 'Insights',
        'nav.messaging': 'Messaging',
        'nav.timesheet': 'Timesheet',
        'nav.settings': 'Settings',
        'nav.sync_errors': 'Sync Errors',
        'nav.more': 'More',

        // ── Dashboard ──
        'dashboard.title': 'Orchard Overview',
        'dashboard.live_monitoring': 'Live monitoring',
        'dashboard.velocity': 'Velocity',
        'dashboard.production': 'Production',
        'dashboard.est_cost': 'Est. Cost',
        'dashboard.active_crew': 'Active Crew',
        'dashboard.buckets': 'buckets',
        'dashboard.pickers': 'pickers',
        'dashboard.daily_target': 'Daily Target',
        'dashboard.complete': 'Complete',
        'dashboard.remaining': 'remaining',
        'dashboard.export': 'Export',
        'dashboard.live_map': 'Live Map',
        'dashboard.broadcast': 'Broadcast',

        // ── Fraud Shield ──
        'fraud.title': 'Fraud Shield',
        'fraud.live': 'Live',
        'fraud.demo': 'Demo',
        'fraud.server_side': 'Server-side detection — real-time analysis of scan patterns',
        'fraud.intelligent': 'Intelligent detection — understands real orchard workflows',
        'fraud.high': 'High',
        'fraud.medium': 'Medium',
        'fraud.low': 'Low',
        'fraud.dismissed': 'Dismissed',
        'fraud.no_anomalies': 'No anomalies detected',
        'fraud.normal_patterns': 'All scan patterns look normal for this filter',
        'fraud.all_flags': 'All Flags',
        'fraud.impossible_rate': 'Impossible Rate',
        'fraud.post_pickup': 'Post-Pickup',
        'fraud.peer_outlier': 'Peer Outlier',
        'fraud.off_hours': 'Off Hours',
        'fraud.duplicates': 'Duplicates',
        'fraud.inspect_profile': 'Inspect Profile & History',
        'fraud.smart_dismissals': 'Smart Dismissals',
        'fraud.scenarios_ignored': 'scenarios correctly ignored — the system understands your orchard',
        'fraud.analyzing': 'Analyzing scan patterns…',
        'fraud.refresh': 'Refresh anomalies',
        'fraud.rule_elapsed': 'Rule 1: Elapsed Time',
        'fraud.rule_peer': 'Rule 2: Peer Check',
        'fraud.rule_grace': 'Rule 3: Grace Period',
        'fraud.rule_elapsed_desc': 'Measures buckets ÷ time since last collection. Accumulated buckets under trees = normal. Impossible after-pickup spike = alert.',
        'fraud.rule_peer_desc': 'Compares each picker to their row mates. If everyone is fast = good tree. If ONLY one person is racing = suspicious.',
        'fraud.rule_grace_desc': 'First 90 min = warmup. Ladders, cold fruit, no tractors yet. System observes silently, only flags impossible velocity.',

        // ── Timesheet ──
        'timesheet.title': 'Timesheet Editor',
        'timesheet.attendance': 'Attendance Records',
        'timesheet.hours': 'Hours',

        // ── Sync Errors ──
        'sync.title': 'Sync Errors',
        'sync.dead_letter': 'Dead Letter Queue',
        'sync.all_clear': 'All Clear!',
        'sync.no_errors': 'No sync errors detected',

        // ── Settings ──
        'settings.title': 'Settings',
        'settings.language': 'Language',
        'settings.language_desc': 'Choose your preferred language',
        'settings.notifications': 'Notifications',
        'settings.profile': 'Profile',
        'settings.security': 'Security',
        'settings.about': 'About',

        // ── Common ──
        'common.loading': 'Loading…',
        'common.error': 'Something went wrong',
        'common.retry': 'Retry',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.close': 'Close',
        'common.search': 'Search',
        'common.filter': 'Filter',
        'common.today': 'Today',
        'common.yesterday': 'Yesterday',
        'common.sign_out': 'Sign Out',

        // ── Scanner ──
        'scanner.scan': 'Scan',
        'scanner.manual_entry': 'Enter code manually',
        'scanner.camera_unavailable': 'Camera unavailable',
        'scanner.native': 'NATIVE',
        'scanner.hardware_accelerated': 'Using hardware-accelerated scanner',
        'scanner.align_qr': 'Align QR code within frame',
        'scanner.submit_code': 'Submit Code',
        'scanner.scanned': 'Scanned ✓',
        'scanner.code_registered': 'Code registered successfully',
        'scanner.scan_again': 'Scan Again',
        'scanner.switch_camera': 'Switch to Camera',
        'scanner.problem_scanning': 'Problem scanning? Enter code manually',

        // ── Auth ──
        'auth.welcome': 'Welcome back!',
        'auth.sign_in': 'Sign In',
        'auth.sign_in_desc': 'Sign in to access your dashboard',
        'auth.register': 'Register',
        'auth.email': 'Email',
        'auth.password': 'Password',
        'auth.forgot_password': 'Forgot your password?',

        // ── PWA ──
        'pwa.storage_warning': 'Non-persistent storage: install the app from your browser to protect offline data.',
    },

    es: {
        // ── Navegación ──
        'nav.dashboard': 'Panel',
        'nav.teams': 'Equipos',
        'nav.orchard_map': 'Mapa del Huerto',
        'nav.logistics': 'Logística',
        'nav.insights': 'Análisis',
        'nav.messaging': 'Mensajes',
        'nav.timesheet': 'Planilla',
        'nav.settings': 'Ajustes',
        'nav.sync_errors': 'Errores de Sync',
        'nav.more': 'Más',

        // ── Panel ──
        'dashboard.title': 'Vista del Huerto',
        'dashboard.live_monitoring': 'Monitoreo en vivo',
        'dashboard.velocity': 'Velocidad',
        'dashboard.production': 'Producción',
        'dashboard.est_cost': 'Costo Est.',
        'dashboard.active_crew': 'Equipo Activo',
        'dashboard.buckets': 'cubetas',
        'dashboard.pickers': 'recolectores',
        'dashboard.daily_target': 'Meta Diaria',
        'dashboard.complete': 'Completo',
        'dashboard.remaining': 'restante',
        'dashboard.export': 'Exportar',
        'dashboard.live_map': 'Mapa en Vivo',
        'dashboard.broadcast': 'Transmitir',

        // ── Escudo Anti-Fraude ──
        'fraud.title': 'Escudo Anti-Fraude',
        'fraud.live': 'En Vivo',
        'fraud.demo': 'Demo',
        'fraud.server_side': 'Detección del servidor — análisis en tiempo real de patrones de escaneo',
        'fraud.intelligent': 'Detección inteligente — entiende flujos reales del huerto',
        'fraud.high': 'Alto',
        'fraud.medium': 'Medio',
        'fraud.low': 'Bajo',
        'fraud.dismissed': 'Descartados',
        'fraud.no_anomalies': 'No se detectaron anomalías',
        'fraud.normal_patterns': 'Todos los patrones de escaneo lucen normales',
        'fraud.all_flags': 'Todas',
        'fraud.impossible_rate': 'Tasa Imposible',
        'fraud.post_pickup': 'Post-Recolección',
        'fraud.peer_outlier': 'Atípico entre Pares',
        'fraud.off_hours': 'Fuera de Horario',
        'fraud.duplicates': 'Duplicados',
        'fraud.inspect_profile': 'Ver Perfil e Historial',
        'fraud.smart_dismissals': 'Descartes Inteligentes',
        'fraud.scenarios_ignored': 'escenarios ignorados correctamente — el sistema entiende tu huerto',
        'fraud.analyzing': 'Analizando patrones de escaneo…',
        'fraud.refresh': 'Actualizar anomalías',
        'fraud.rule_elapsed': 'Regla 1: Tiempo Transcurrido',
        'fraud.rule_peer': 'Regla 2: Comparación entre Pares',
        'fraud.rule_grace': 'Regla 3: Periodo de Gracia',
        'fraud.rule_elapsed_desc': 'Mide cubetas ÷ tiempo desde última recolección. Cubetas acumuladas bajo árboles = normal. Pico imposible post-recolección = alerta.',
        'fraud.rule_peer_desc': 'Compara a cada recolector con sus compañeros de fila. Si todos son rápidos = buen árbol. Si SOLO una persona va rápido = sospechoso.',
        'fraud.rule_grace_desc': 'Primeros 90 min = calentamiento. Escaleras, fruta fría, sin tractores aún. El sistema observa silenciosamente.',

        // ── Planilla ──
        'timesheet.title': 'Editor de Planilla',
        'timesheet.attendance': 'Registros de Asistencia',
        'timesheet.hours': 'Horas',

        // ── Errores de Sincronización ──
        'sync.title': 'Errores de Sincronización',
        'sync.dead_letter': 'Cola de Pendientes',
        'sync.all_clear': '¡Todo Limpio!',
        'sync.no_errors': 'No se detectaron errores de sincronización',

        // ── Ajustes ──
        'settings.title': 'Ajustes',
        'settings.language': 'Idioma',
        'settings.language_desc': 'Elige tu idioma preferido',
        'settings.notifications': 'Notificaciones',
        'settings.profile': 'Perfil',
        'settings.security': 'Seguridad',
        'settings.about': 'Acerca de',

        // ── Comunes ──
        'common.loading': 'Cargando…',
        'common.error': 'Algo salió mal',
        'common.retry': 'Reintentar',
        'common.cancel': 'Cancelar',
        'common.save': 'Guardar',
        'common.close': 'Cerrar',
        'common.search': 'Buscar',
        'common.filter': 'Filtrar',
        'common.today': 'Hoy',
        'common.yesterday': 'Ayer',
        'common.sign_out': 'Cerrar Sesión',

        // ── Escáner ──
        'scanner.scan': 'Escanear',
        'scanner.manual_entry': 'Ingresar código manualmente',
        'scanner.camera_unavailable': 'Cámara no disponible',
        'scanner.native': 'NATIVO',
        'scanner.hardware_accelerated': 'Usando escáner acelerado por hardware',
        'scanner.align_qr': 'Alinea el código QR en el marco',
        'scanner.submit_code': 'Enviar Código',
        'scanner.scanned': 'Escaneado ✓',
        'scanner.code_registered': 'Código registrado exitosamente',
        'scanner.scan_again': 'Escanear de Nuevo',
        'scanner.switch_camera': 'Cambiar a Cámara',
        'scanner.problem_scanning': '¿Problema escaneando? Ingresa el código manualmente',

        // ── Autenticación ──
        'auth.welcome': '¡Bienvenido!',
        'auth.sign_in': 'Iniciar Sesión',
        'auth.sign_in_desc': 'Inicia sesión para acceder a tu panel',
        'auth.register': 'Registrarse',
        'auth.email': 'Correo Electrónico',
        'auth.password': 'Contraseña',
        'auth.forgot_password': '¿Olvidaste tu contraseña?',

        // ── PWA ──
        'pwa.storage_warning': 'Almacenamiento no persistente: instala la app desde el navegador para proteger los datos offline.',
    },

    mi: {
        // ── Whakatere (Navigation) ──
        'nav.dashboard': 'Papatohu',
        'nav.teams': 'Ngā Rōpū',
        'nav.orchard_map': 'Mahere Māra',
        'nav.logistics': 'Whakahaere Rawa',
        'nav.insights': 'Ngā Tirohanga',
        'nav.messaging': 'Ngā Karere',
        'nav.timesheet': 'Rēhita Wā',
        'nav.settings': 'Ngā Tautuhinga',
        'nav.sync_errors': 'Hapa Tukutahi',
        'nav.more': 'Ētahi Atu',

        // ── Papatohu (Dashboard) ──
        'dashboard.title': 'Tirohanga Māra',
        'dashboard.live_monitoring': 'Aroturuki Ora',
        'dashboard.velocity': 'Tere',
        'dashboard.production': 'Whakaputa',
        'dashboard.est_cost': 'Utu Whakatau',
        'dashboard.active_crew': 'Rōpū Hohe',
        'dashboard.buckets': 'ngā pākete',
        'dashboard.pickers': 'ngā kaikohi',
        'dashboard.daily_target': 'Whāinga o te Rā',
        'dashboard.complete': 'Oti',
        'dashboard.remaining': 'e toe ana',
        'dashboard.export': 'Tuku ki Waho',
        'dashboard.live_map': 'Mahere Ora',
        'dashboard.broadcast': 'Pāpāho',

        // ── Puāwai Anti-Fraude ──
        'fraud.title': 'Puāwai Haumaru',
        'fraud.live': 'Ora',
        'fraud.demo': 'Whakaatu',
        'fraud.server_side': 'Kitenga tūmau — tātaritanga wā-tūturu',
        'fraud.intelligent': 'Kitenga atamai — mārama ki ngā ritenga māra',
        'fraud.high': 'Teitei',
        'fraud.medium': 'Waenga',
        'fraud.low': 'Iti',
        'fraud.dismissed': 'Whakakore',
        'fraud.no_anomalies': 'Kāore he rerekētanga i kitea',
        'fraud.normal_patterns': 'He pai ngā tauira katoa',
        'fraud.all_flags': 'Katoa',
        'fraud.analyzing': 'E tātari ana i ngā tauira…',
        'fraud.refresh': 'Whakahou',

        // ── Ngā Tautuhinga (Settings) ──
        'settings.title': 'Ngā Tautuhinga',
        'settings.language': 'Reo',
        'settings.language_desc': 'Kōwhiria tō reo',

        // ── Noa (Common) ──
        'common.loading': 'E uta ana…',
        'common.error': 'He hapa',
        'common.retry': 'Ngana anō',
        'common.cancel': 'Whakakore',
        'common.save': 'Tiaki',
        'common.close': 'Kati',
        'common.search': 'Rapu',
        'common.filter': 'Tātari',
        'common.today': 'I tēnei rā',
        'common.yesterday': 'Inanahi',
        'common.sign_out': 'Takiputa',

        // ── Motuhēhē (Auth) ──
        'auth.welcome': 'Nau mai!',
        'auth.sign_in': 'Takiuru',
        'auth.sign_in_desc': 'Takiuru ki tō papatohu',
        'auth.register': 'Rēhita',
        'auth.email': 'Īmēra',
        'auth.password': 'Kupuhipa',
        'auth.forgot_password': 'Kua wareware tō kupuhipa?',
    },

    sm: {
        // ── Navigation ──
        'nav.dashboard': 'Fa\'amatalaga',
        'nav.teams': 'Vaega',
        'nav.orchard_map': 'Fa\'afanua o le Togāfua',
        'nav.logistics': 'Fa\'asologa',
        'nav.insights': 'Iloiloga',
        'nav.messaging': 'Fe\'au',
        'nav.timesheet': 'Lisi Taimi',
        'nav.settings': 'Fa\'atulagaga',
        'nav.sync_errors': 'Mea Sese',
        'nav.more': 'Toe Isi',

        // ── Dashboard ──
        'dashboard.title': 'Va\'aiga Togāfua',
        'dashboard.live_monitoring': 'Va\'aiga Ola',
        'dashboard.velocity': 'Saoasaoa',
        'dashboard.production': 'Gaosiga',
        'dashboard.est_cost': 'Tupe Fa\'amoemoe',
        'dashboard.active_crew': 'Vaega Galue',
        'dashboard.buckets': 'ātigi',
        'dashboard.pickers': 'tagata selesele',
        'dashboard.daily_target': 'Sini o le Aso',
        'dashboard.complete': 'Maeʻa',
        'dashboard.remaining': 'totoe',
        'dashboard.export': 'Auina',
        'dashboard.live_map': 'Fa\'afanua Ola',
        'dashboard.broadcast': 'Fa\'asalalau',

        // ── Settings ──
        'settings.title': 'Fa\'atulagaga',
        'settings.language': 'Gagana',
        'settings.language_desc': 'Filifili lau gagana',
        'settings.notifications': 'Fa\'asilasilaga',
        'settings.profile': 'Fa\'amatalaga',
        'settings.security': 'Saogalemu',
        'settings.about': 'Faʻamatalaga',

        // ── Common ──
        'common.loading': 'Fa\'atali…',
        'common.error': 'Sa i ai se mea sese',
        'common.retry': 'Toe Taumafai',
        'common.cancel': 'Fa\'aleaogaina',
        'common.save': 'Fa\'asao',
        'common.close': 'Tapuni',
        'common.search': 'Su\'e',
        'common.filter': 'Loli',
        'common.today': 'Ananafi',
        'common.yesterday': 'Ananafi Talu',
        'common.sign_out': 'Ese',

        // ── Auth ──
        'auth.welcome': 'Afio Mai!',
        'auth.sign_in': 'Ulufale',
        'auth.sign_in_desc': 'Ulufale e a\'oa\'o lou fa\'amatalaga',
        'auth.register': 'Resitala',
        'auth.email': 'Imeli',
        'auth.password': 'Upu Fa\'ailo',
        'auth.forgot_password': 'Na e galo lou upu fa\'ailo?',

        // ── Scanner ──
        'scanner.scan': 'Skan',
        'scanner.manual_entry': 'Taina le numera',
        'scanner.camera_unavailable': 'E le maua le mea pu\'eata',
        'scanner.native': 'NATIVE',
        'scanner.hardware_accelerated': 'Fa\'aogaina le skan fa\'avaveina',
        'scanner.align_qr': 'Fa\'afeagai le QR i totonu',
        'scanner.submit_code': 'Tu\'uina le numera',
        'scanner.scanned': 'Skan ✓',
        'scanner.code_registered': 'Numera fa\'amaonia',
        'scanner.scan_again': 'Skan Toe',
        'scanner.switch_camera': 'Fa\'aliliu i le mea pu\'eata',
        'scanner.problem_scanning': 'Fa\'afitauli? Taina le numera',

        // ── Fraud ──
        'fraud.title': 'Puipuiga Fa\'asese',
        'fraud.live': 'Ola',
        'fraud.demo': 'Fa\'aali',
        'fraud.high': 'Maualuga',
        'fraud.medium': 'Totonu',
        'fraud.low': 'Maualalo',
        'fraud.dismissed': 'Fa\'aleaogaina',
        'fraud.no_anomalies': 'E leai ni mea eseese',
        'fraud.normal_patterns': 'E masani mea uma',
        'fraud.all_flags': 'Uma',
        'fraud.analyzing': 'Su\'esu\'e…',
        'fraud.refresh': 'Toe Fa\'afou',
        'fraud.server_side': 'Fa\'ailo tūmau — su\'esu\'e fa\'aogaina',
        'fraud.intelligent': 'Su\'esu\'e atamai',
        'fraud.impossible_rate': 'Saoasaoa e le mafai',
        'fraud.post_pickup': 'Ina ua uma',
        'fraud.peer_outlier': 'E ese mai isi',
        'fraud.off_hours': 'I fafo o taimi',
        'fraud.duplicates': 'Fa\'alua',
        'fraud.inspect_profile': 'Su\'e Fa\'amatalaga',
        'fraud.smart_dismissals': 'Fa\'aleaogaina atamai',
        'fraud.scenarios_ignored': 'tulaga sa fa\'aleaogaina sa\'o',
        'fraud.rule_elapsed': 'Tulafono 1: Taimi',
        'fraud.rule_peer': 'Tulafono 2: Fa\'atusatusa',
        'fraud.rule_grace': 'Tulafono 3: Taimi Fa\'amautinoa',
        'fraud.rule_elapsed_desc': 'Fa\'atatau i ātigi ÷ taimi. Masani = lelei.',
        'fraud.rule_peer_desc': 'Fa\'atusatusa tagata uma. Soo se tasi saoasaoa = masalomia.',
        'fraud.rule_grace_desc': 'Uluai 90 minute = taimi fa\'amautinoa. Matamata faaletonu.',

        // ── Timesheet ──
        'timesheet.title': 'Fa\'asologa Taimi',
        'timesheet.attendance': 'Fa\'amaumauga Fa\'aali',
        'timesheet.hours': 'Itula',

        // ── Sync ──
        'sync.title': 'Mea Sese Fa\'afesoʻotaʻi',
        'sync.dead_letter': 'Fa\'afilosofia',
        'sync.all_clear': 'Lelei!',
        'sync.no_errors': 'E leai ni mea sese',
    },

    hi: {
        // ── Navigation ──
        'nav.dashboard': 'डैशबोर्ड',
        'nav.teams': 'टीमें',
        'nav.orchard_map': 'बाग का नक्शा',
        'nav.logistics': 'लॉजिस्टिक्स',
        'nav.insights': 'विश्लेषण',
        'nav.messaging': 'संदेश',
        'nav.timesheet': 'टाइमशीट',
        'nav.settings': 'सेटिंग्स',
        'nav.sync_errors': 'सिंक त्रुटियाँ',
        'nav.more': 'और',

        // ── Dashboard ──
        'dashboard.title': 'बाग का अवलोकन',
        'dashboard.live_monitoring': 'लाइव निगरानी',
        'dashboard.velocity': 'गति',
        'dashboard.production': 'उत्पादन',
        'dashboard.est_cost': 'अनुमानित लागत',
        'dashboard.active_crew': 'सक्रिय टीम',
        'dashboard.buckets': 'बाल्टियाँ',
        'dashboard.pickers': 'तोड़ने वाले',
        'dashboard.daily_target': 'दैनिक लक्ष्य',
        'dashboard.complete': 'पूर्ण',
        'dashboard.remaining': 'शेष',
        'dashboard.export': 'निर्यात',
        'dashboard.live_map': 'लाइव मैप',
        'dashboard.broadcast': 'प्रसारण',

        // ── Settings ──
        'settings.title': 'सेटिंग्स',
        'settings.language': 'भाषा',
        'settings.language_desc': 'अपनी पसंदीदा भाषा चुनें',
        'settings.notifications': 'सूचनाएं',
        'settings.profile': 'प्रोफ़ाइल',
        'settings.security': 'सुरक्षा',
        'settings.about': 'के बारे में',

        // ── Common ──
        'common.loading': 'लोड हो रहा है…',
        'common.error': 'कुछ गलत हो गया',
        'common.retry': 'पुनः प्रयास करें',
        'common.cancel': 'रद्द करें',
        'common.save': 'सहेजें',
        'common.close': 'बंद करें',
        'common.search': 'खोजें',
        'common.filter': 'फ़िल्टर',
        'common.today': 'आज',
        'common.yesterday': 'कल',
        'common.sign_out': 'साइन आउट',

        // ── Auth ──
        'auth.welcome': 'वापस स्वागत है!',
        'auth.sign_in': 'साइन इन करें',
        'auth.sign_in_desc': 'अपने डैशबोर्ड तक पहुँचने के लिए साइन इन करें',
        'auth.register': 'पंजीकरण',
        'auth.email': 'ईमेल',
        'auth.password': 'पासवर्ड',
        'auth.forgot_password': 'पासवर्ड भूल गए?',

        // ── Scanner ──
        'scanner.scan': 'स्कैन',
        'scanner.manual_entry': 'कोड मैन्युअल दर्ज करें',
        'scanner.camera_unavailable': 'कैमरा उपलब्ध नहीं',
        'scanner.native': 'नेटिव',
        'scanner.hardware_accelerated': 'हार्डवेयर-त्वरित स्कैनर उपयोग में',
        'scanner.align_qr': 'QR कोड को फ्रेम में संरेखित करें',
        'scanner.submit_code': 'कोड जमा करें',
        'scanner.scanned': 'स्कैन हो गया ✓',
        'scanner.code_registered': 'कोड सफलतापूर्वक पंजीकृत',
        'scanner.scan_again': 'फिर से स्कैन करें',
        'scanner.switch_camera': 'कैमरे पर स्विच करें',
        'scanner.problem_scanning': 'स्कैन में समस्या? कोड मैन्युअल दर्ज करें',

        // ── Fraud ──
        'fraud.title': 'धोखाधड़ी सुरक्षा',
        'fraud.live': 'लाइव',
        'fraud.demo': 'डेमो',
        'fraud.high': 'उच्च',
        'fraud.medium': 'मध्यम',
        'fraud.low': 'कम',
        'fraud.dismissed': 'खारिज',
        'fraud.no_anomalies': 'कोई असामान्यता नहीं मिली',
        'fraud.normal_patterns': 'सभी स्कैन पैटर्न सामान्य दिखते हैं',
        'fraud.all_flags': 'सभी',
        'fraud.analyzing': 'स्कैन पैटर्न का विश्लेषण…',
        'fraud.refresh': 'असामान्यताएं ताज़ा करें',
        'fraud.server_side': 'सर्वर-साइड पहचान — रियल-टाइम विश्लेषण',
        'fraud.intelligent': 'बुद्धिमान पहचान',
        'fraud.impossible_rate': 'असंभव दर',
        'fraud.post_pickup': 'पिकअप के बाद',
        'fraud.peer_outlier': 'साथियों से अलग',
        'fraud.off_hours': 'कार्यसमय से बाहर',
        'fraud.duplicates': 'डुप्लिकेट',
        'fraud.inspect_profile': 'प्रोफ़ाइल और इतिहास देखें',
        'fraud.smart_dismissals': 'स्मार्ट बर्खास्तगी',
        'fraud.scenarios_ignored': 'परिदृश्य सही ढंग से अनदेखा',
        'fraud.rule_elapsed': 'नियम 1: बीता समय',
        'fraud.rule_peer': 'नियम 2: साथी जांच',
        'fraud.rule_grace': 'नियम 3: ग्रेस अवधि',
        'fraud.rule_elapsed_desc': 'बाल्टियाँ ÷ संग्रह के बाद का समय मापता है।',
        'fraud.rule_peer_desc': 'प्रत्येक पिकर की उनके पंक्ति साथियों से तुलना करता है।',
        'fraud.rule_grace_desc': 'पहले 90 मिनट = वार्मअप। सिस्टम चुपचाप देखता है।',

        // ── Timesheet ──
        'timesheet.title': 'टाइमशीट संपादक',
        'timesheet.attendance': 'उपस्थिति रिकॉर्ड',
        'timesheet.hours': 'घंटे',

        // ── Sync ──
        'sync.title': 'सिंक त्रुटियाँ',
        'sync.dead_letter': 'डेड लेटर कतार',
        'sync.all_clear': 'सब ठीक है!',
        'sync.no_errors': 'कोई सिंक त्रुटि नहीं',
    },

    to: {
        // ── Navigation ──
        'nav.dashboard': 'Peesi Mālohi',
        'nav.teams': 'Ngaahi Kautaha',
        'nav.orchard_map': 'Mape \'o e Ngaahi\'anga',
        'nav.logistics': 'Ngaahi Ngāue',
        'nav.insights': 'Fakakaukau',
        'nav.messaging': 'Ngaahi Pōpoaki',
        'nav.timesheet': 'Lēkooti Taimi',
        'nav.settings': 'Ngaahi Setenga',
        'nav.sync_errors': 'Ngaahi Hala',
        'nav.more': 'Toe Lahi Ange',

        // ── Dashboard ──
        'dashboard.title': 'Vakai ki he Ngaahi\'anga',
        'dashboard.live_monitoring': 'Vakai Moʻui',
        'dashboard.velocity': 'Vave',
        'dashboard.production': 'Ngaahi Koloa',
        'dashboard.est_cost': 'Fakakaukau ki he Totongi',
        'dashboard.active_crew': 'Kautaha Ngāue',
        'dashboard.buckets': 'ngaahi ipu',
        'dashboard.pickers': 'kau toli',
        'dashboard.daily_target': 'Sīpinga ʻo e Aho',
        'dashboard.complete': 'Kakato',
        'dashboard.remaining': 'toe',
        'dashboard.export': 'ʻEkipooti',
        'dashboard.live_map': 'Mape Moʻui',
        'dashboard.broadcast': 'Fakaholoholo',

        // ── Settings ──
        'settings.title': 'Ngaahi Setenga',
        'settings.language': 'Lea',
        'settings.language_desc': 'Fili ho\'o lea',
        'settings.notifications': 'Fakamatala',
        'settings.profile': 'Fakamatala Fakafo\'ituitui',
        'settings.security': 'Maluʻi',
        'settings.about': 'Fekauʻaki',

        // ── Common ──
        'common.loading': 'ʻOku hiki…',
        'common.error': 'Kuó hoko ha hala',
        'common.retry': 'Toe Feinga',
        'common.cancel': 'Fakatoʻo',
        'common.save': 'Tauhi',
        'common.close': 'Kāpuni',
        'common.search': 'Kumi',
        'common.filter': 'Fesiofaki',
        'common.today': 'ʻAho Ni',
        'common.yesterday': 'ʻAneafi',
        'common.sign_out': 'Maʻu Kimui',

        // ── Auth ──
        'auth.welcome': 'Mālō e lelei!',
        'auth.sign_in': 'Hū ki Loto',
        'auth.sign_in_desc': 'Hū ki loto ke vakai ho\'o peesi',
        'auth.register': 'Lēkooti',
        'auth.email': 'Īmeli',
        'auth.password': 'Leá Hūfi',
        'auth.forgot_password': 'Naʻa ke ngalo ho\'o leá hūfi?',

        // ── Scanner ──
        'scanner.scan': 'Sikaná',
        'scanner.manual_entry': 'Hū ki he kouti',
        'scanner.camera_unavailable': 'ʻOku ʻikai lava e kamera',
        'scanner.native': 'NATIVE',
        'scanner.hardware_accelerated': 'ʻOku ngāue e sikanā vave',
        'scanner.align_qr': 'Fokotuʻu e QR ki loto',
        'scanner.submit_code': 'Tukuange e Kouti',
        'scanner.scanned': 'Sikaná ✓',
        'scanner.code_registered': 'Kouti ʻoku lēkooti',
        'scanner.scan_again': 'Sikaná Toe',
        'scanner.switch_camera': 'Hiki ki he Kamera',
        'scanner.problem_scanning': 'Faingataʻa? Hū ki he kouti',

        // ── Fraud ──
        'fraud.title': 'Maluʻi mei he Kākā',
        'fraud.live': 'Moʻui',
        'fraud.demo': 'Fakaʻasi',
        'fraud.high': 'Māʻolunga',
        'fraud.medium': 'Waenganoa',
        'fraud.low': 'Māʻulalo',
        'fraud.dismissed': 'Siʻaki',
        'fraud.no_anomalies': 'ʻOku ʻikai ha meʻa kehekehe',
        'fraud.normal_patterns': 'ʻOku lelei e ngaahi sīpinga',
        'fraud.all_flags': 'Kotoa',
        'fraud.analyzing': 'ʻOku tātā…',
        'fraud.refresh': 'Fohola Foʻou',
        'fraud.server_side': 'Kumi ʻi he seʻivá',
        'fraud.intelligent': 'Kumi Poto',
        'fraud.impossible_rate': 'Vave ʻOku ʻikai Lava',
        'fraud.post_pickup': 'Hili e Toli',
        'fraud.peer_outlier': 'ʻOku ʻEki mei he Kaungāmeʻa',
        'fraud.off_hours': 'ʻOtu Taimi',
        'fraud.duplicates': 'Totuʻa',
        'fraud.inspect_profile': 'Vakai ki he Fakamatala',
        'fraud.smart_dismissals': 'Siʻaki Poto',
        'fraud.scenarios_ignored': 'ngaahi ʻaho naʻe siʻaki saʻia',
        'fraud.rule_elapsed': 'Lao 1: Taimi',
        'fraud.rule_peer': 'Lao 2: Kaungāmeʻa',
        'fraud.rule_grace': 'Lao 3: Taimi Fakaʻofa',
        'fraud.rule_elapsed_desc': 'Ngaahi ipu ÷ taimi. ʻOku totonu = lelei.',
        'fraud.rule_peer_desc': 'Fakahoa kotoa. Taha pe ʻoku vave = fehuʻi.',
        'fraud.rule_grace_desc': 'ʻUluaki 90 miniti = taimi fakaʻofa. Vakai lū.',

        // ── Timesheet ──
        'timesheet.title': 'Fakatonutonu Taimi',
        'timesheet.attendance': 'Lēkooti Haʻu',
        'timesheet.hours': 'Ngaahi Houa',

        // ── Sync ──
        'sync.title': 'Ngaahi Hala Fesiofaki',
        'sync.dead_letter': 'Līsiti Tukuofa',
        'sync.all_clear': 'ʻOku Lelei!',
        'sync.no_errors': 'ʻOku ʻikai ha hala',
    },

    tl: {
        // ── Navigation ──
        'nav.dashboard': 'Dashboard',
        'nav.teams': 'Mga Koponan',
        'nav.orchard_map': 'Mapa ng Taniman',
        'nav.logistics': 'Logistics',
        'nav.insights': 'Pagsusuri',
        'nav.messaging': 'Pagmemensahe',
        'nav.timesheet': 'Timesheet',
        'nav.settings': 'Mga Setting',
        'nav.sync_errors': 'Mga Error sa Sync',
        'nav.more': 'Higit Pa',

        // ── Dashboard ──
        'dashboard.title': 'Pangkalahatang-tanaw ng Taniman',
        'dashboard.live_monitoring': 'Live na Pagsubaybay',
        'dashboard.velocity': 'Bilis',
        'dashboard.production': 'Produksyon',
        'dashboard.est_cost': 'Tinatayang Gastos',
        'dashboard.active_crew': 'Aktibong Pangkat',
        'dashboard.buckets': 'mga timba',
        'dashboard.pickers': 'mga manguha',
        'dashboard.daily_target': 'Araw-araw na Target',
        'dashboard.complete': 'Tapos na',
        'dashboard.remaining': 'natitira',
        'dashboard.export': 'I-export',
        'dashboard.live_map': 'Live na Mapa',
        'dashboard.broadcast': 'I-broadcast',

        // ── Settings ──
        'settings.title': 'Mga Setting',
        'settings.language': 'Wika',
        'settings.language_desc': 'Piliin ang iyong ginustong wika',
        'settings.notifications': 'Mga Abiso',
        'settings.profile': 'Profile',
        'settings.security': 'Seguridad',
        'settings.about': 'Tungkol sa',

        // ── Common ──
        'common.loading': 'Naglo-load…',
        'common.error': 'May naganap na error',
        'common.retry': 'Subukan Muli',
        'common.cancel': 'Kanselahin',
        'common.save': 'I-save',
        'common.close': 'Isara',
        'common.search': 'Maghanap',
        'common.filter': 'Mag-filter',
        'common.today': 'Ngayon',
        'common.yesterday': 'Kahapon',
        'common.sign_out': 'Mag-sign Out',

        // ── Auth ──
        'auth.welcome': 'Maligayang pagbabalik!',
        'auth.sign_in': 'Mag-sign In',
        'auth.sign_in_desc': 'Mag-sign in para ma-access ang iyong dashboard',
        'auth.register': 'Mag-rehistro',
        'auth.email': 'Email',
        'auth.password': 'Password',
        'auth.forgot_password': 'Nakalimutan ang password?',

        // ── Scanner ──
        'scanner.scan': 'I-scan',
        'scanner.manual_entry': 'Ilagay ang code nang mano-mano',
        'scanner.camera_unavailable': 'Hindi available ang camera',
        'scanner.native': 'NATIVE',
        'scanner.hardware_accelerated': 'Gumagamit ng hardware-accelerated scanner',
        'scanner.align_qr': 'I-align ang QR code sa loob ng frame',
        'scanner.submit_code': 'Isumite ang Code',
        'scanner.scanned': 'Na-scan ✓',
        'scanner.code_registered': 'Matagumpay na nairehistro ang code',
        'scanner.scan_again': 'I-scan Muli',
        'scanner.switch_camera': 'Lumipat sa Camera',
        'scanner.problem_scanning': 'May problema? Ilagay ang code nang mano-mano',

        // ── Fraud ──
        'fraud.title': 'Kalasag Laban sa Pandaraya',
        'fraud.live': 'Live',
        'fraud.demo': 'Demo',
        'fraud.high': 'Mataas',
        'fraud.medium': 'Katamtaman',
        'fraud.low': 'Mababa',
        'fraud.dismissed': 'Tinanggal',
        'fraud.no_anomalies': 'Walang anomaliya na natagpuan',
        'fraud.normal_patterns': 'Normal ang lahat ng pattern ng pag-scan',
        'fraud.all_flags': 'Lahat',
        'fraud.analyzing': 'Sinusuri ang mga pattern…',
        'fraud.refresh': 'I-refresh ang mga anomaliya',
        'fraud.server_side': 'Pagtuklas sa server — real-time na pagsusuri',
        'fraud.intelligent': 'Matalinong pagtuklas',
        'fraud.impossible_rate': 'Imposibleng Rate',
        'fraud.post_pickup': 'Pagkatapos ng Pickup',
        'fraud.peer_outlier': 'Naiiba sa Kapantay',
        'fraud.off_hours': 'Labas ng Oras',
        'fraud.duplicates': 'Mga Duplicate',
        'fraud.inspect_profile': 'Suriin ang Profile at Kasaysayan',
        'fraud.smart_dismissals': 'Matalinong Pagtanggal',
        'fraud.scenarios_ignored': 'mga sitwasyong tamang hindi pinansin',
        'fraud.rule_elapsed': 'Panuntunan 1: Lumipas na Oras',
        'fraud.rule_peer': 'Panuntunan 2: Pagsusuri ng Kapantay',
        'fraud.rule_grace': 'Panuntunan 3: Grace Period',
        'fraud.rule_elapsed_desc': 'Sinusukat ang mga timba ÷ oras. Normal = mabuti.',
        'fraud.rule_peer_desc': 'Inihahambing ang bawat manguha sa kanilang mga kasama.',
        'fraud.rule_grace_desc': 'Unang 90 minuto = warmup. Tahimik na nagmamasid.',

        // ── Timesheet ──
        'timesheet.title': 'Editor ng Timesheet',
        'timesheet.attendance': 'Mga Rekord ng Presensya',
        'timesheet.hours': 'Mga Oras',

        // ── Sync ──
        'sync.title': 'Mga Error sa Sync',
        'sync.dead_letter': 'Dead Letter Queue',
        'sync.all_clear': 'Maayos Na!',
        'sync.no_errors': 'Walang sync error na natukoy',
    },
};

// ─── Context ──────────────────────────────────────────────────

interface I18nContextValue {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string) => string;
    localeInfo: LocaleInfo;
}

const I18N_STORAGE_KEY = 'harvestpro_locale';

function getInitialLocale(): Locale {
    try {
        const stored = localStorage.getItem(I18N_STORAGE_KEY) as Locale | null;
        if (stored && translations[stored]) return stored;
    } catch { /* Ignore */ }

    // Auto-detect from browser language (incluye los 4 nuevos idiomas)
    const browserLang = navigator.language?.split('-')[0];
    if (browserLang === 'es') return 'es';
    if (browserLang === 'mi') return 'mi';
    if (browserLang === 'sm') return 'sm';
    if (browserLang === 'hi') return 'hi';
    if (browserLang === 'to') return 'to';
    if (browserLang === 'tl') return 'tl';
    return 'en';
}

const I18nContext = createContext<I18nContextValue>({
    locale: 'en',
    setLocale: () => { },
    t: (key: string) => key,
    localeInfo: SUPPORTED_LOCALES[0],
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

    const setLocale = useCallback((newLocale: Locale) => {
        setLocaleState(newLocale);
        try {
            localStorage.setItem(I18N_STORAGE_KEY, newLocale);
        } catch { /* Ignore */ }
    }, []);

    const t = useCallback((key: string): string => {
        return translations[locale][key] || translations['en'][key] || key;
    }, [locale]);

    const localeInfo = useMemo(
        () => SUPPORTED_LOCALES.find(l => l.code === locale) || SUPPORTED_LOCALES[0],
        [locale]
    );

    const value = useMemo(() => ({ locale, setLocale, t, localeInfo }), [locale, setLocale, t, localeInfo]);

    return React.createElement(I18nContext.Provider, { value }, children);
};

export function useI18n() {
    return useContext(I18nContext);
}

export function useTranslation() {
    const { t, locale, setLocale, localeInfo } = useI18n();
    return { t, locale, setLocale, localeInfo };
}
