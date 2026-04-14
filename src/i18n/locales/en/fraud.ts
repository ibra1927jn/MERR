import type { TranslationDict } from '../../types';

const fraud: TranslationDict = {
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
};

export default fraud;
