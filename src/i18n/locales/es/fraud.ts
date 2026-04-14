import type { TranslationDict } from '../../types';

const fraud: TranslationDict = {
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
};

export default fraud;
