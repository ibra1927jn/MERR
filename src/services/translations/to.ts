// =============================================
// TONGAN TRANSLATIONS (to)
// =============================================

export const translations: Record<string, string> = {
    // Common
    'common.loading': 'ʻOku lōtini...',
    'common.save': 'Seivi',
    'common.cancel': 'Kaniseli',
    'common.close': 'Tāpuni',
    'common.confirm': 'Fakapapau',
    'common.delete': 'Taʻofi',
    'common.edit': 'Faitohi',
    'common.add': 'Fakalahi',
    'common.search': 'Kumi',
    'common.filter': 'Sivi',
    'common.refresh': 'Fakafoʻou',
    'common.back': 'Foki',
    'common.next': 'Hoko',
    'common.done': 'ʻOsi',
    'common.yes': 'ʻIo',
    'common.no': 'ʻIkai',
    'common.ok': 'Sai pē',
    'common.error': 'Hala',
    'common.success': 'Lavameʻa',
    'common.warning': 'Fakatokanga',

    // Navigation
    'nav.logistics': 'Ngaahi Kavenga',
    'nav.runners': 'Kau Lele',
    'nav.warehouse': 'Fale Tukuʻanga',
    'nav.messaging': "Fetu'utaki",
    'nav.team': 'Timi',
    'nav.rows': 'Laine',
    'nav.quality': 'Tuʻunga',
    'nav.settings': 'Fokotū',

    // Headers
    'header.logisticsHub': 'Senita Kavenga',
    'header.orchardRunners': 'Kau Lele ʻo e Ngoue',
    'header.warehouseInventory': 'Meʻa ʻi Fale',
    'header.messagingHub': "Senita Fetu'utaki",
    'header.teamManagement': 'Puleʻanga Timi',
    'header.rowAssignments': 'Vahe Laine',

    // Offline Banner
    'offline.syncPending': 'ʻOku Tatali ki he Fakatahataha',
    'offline.updated': 'Fakafoʻou {{time}} kuo ʻosi',

    // Logistics View
    'logistics.bucketsCollected': 'Kato kuo Tānaki',
    'logistics.full': 'Fonu',
    'logistics.binFull': 'Puha Fonu',
    'logistics.active': 'Ngāue',
    'logistics.ready': 'Mateuteu',
    'logistics.approachingLimit': '⚠️ ʻOku ofi ki he kato ʻe 72',
    'logistics.prepareSwap': 'Teuteu ke liliu e puha',
    'logistics.limitReached': '🚫 ʻOku KAKATO - ʻOUA FAKALAHI',
    'logistics.closeImmediately': 'Tāpuni vave e puha ke malu e fua',

    // Sun Exposure
    'sun.exposure': 'Huelo ʻo e Laʻā',
    'sun.critical': "🚨 MAHU'INGA!",
    'sun.safeLevel': 'Tuʻunga Malu',
    'sun.moveToShade': 'Aveʻi ki he malu!',

    // Supply Management
    'supply.management': 'Puleʻanga Koloa',
    'supply.emptyBins': 'Puha Maha',
    'supply.fullBins': 'Puha Fonu',
    'supply.low': '⚠️ Maʻulalo',
    'supply.ok': 'Sai',
    'supply.requestRefill': 'Kole Koloa',
    'supply.refillRequested': '📦 Kuo kole koloa!',
    'supply.binsEnRoute': '✅ {{count}} puha maha ʻoku haʻu',
    'supply.eta': '🚛 Taimi tūʻuta: {{minutes}} miniti mei Fale',

    // Runners
    'runners.active': 'Kau Lele Ngāue',
    'runners.addRunner': 'Fakalahi Tokotaha Lele',
    'runners.noActive': 'ʻIkai ha Tokotaha Lele',
    'runners.addFirst': 'Fakalahi ʻUluaki Tokotaha',
    'runners.addToTrack': 'Fakalahi kau lele ke muimui',
    'runners.manageRunner': 'Puleʻi Tokotaha',
    'runners.started': 'Kamata {{time}}',
    'runners.assignment': 'Vahenga',
    'runners.noAssignment': 'ʻIkai ha vahenga',
    'runners.buckets': 'Kato',
    'runners.bins': 'Puha',
    'runners.orchardMap': 'Mape Ngoue',
    'runners.gpsComingSoon': 'GPS taimi moʻoni ʻoku haʻu',

    // Warehouse
    'warehouse.harvestedStock': 'Koloa Kuo Utu',
    'warehouse.fullCherryBins': 'Puha Seli Fonu',
    'warehouse.filled': 'fonu',
    'warehouse.manualAdjustment': 'Fakafoʻou Nima:',
    'warehouse.emptyBinsAvailable': 'Puha Maha ʻOku ʻI Ai',
    'warehouse.waitingTransport': 'Tatali Fefonongaʻaki',
    'warehouse.critical': "🚨 MHU'INGA: Kuo 'osi puha maha!",
    'warehouse.lowStock': '⚠️ Fakatokanga koloa maʻulalo',
    'warehouse.requestResupply': 'Kole vave koloa mei Fale',
    'warehouse.nextTruck': 'Loli Hoko',
    'warehouse.scheduledArrival': 'Tūʻuta ʻi {{minutes}} miniti mei Fale A',
    'warehouse.requestTransport': 'Kole Fefonongaʻaki',

    // Scanner
    'scanner.scanBin': 'Sio Puha',
    'scanner.scanSticker': 'Sio Stika',
    'scanner.binScanned': '✅ Kuo sio e Puha',
    'scanner.bucketRegistered': '✅ Kuo lesiteli e kato!',

    // Quality Control
    'qc.inspection': 'Sivi Tuʻunga',
    'qc.grade': 'Kalasi',
    'qc.good': 'Lelei',
    'qc.warning': 'Fakatokanga',
    'qc.bad': 'Kovi',
    'qc.viewHistory': 'Sio Hisitōlia Sivi',
    'qc.noInspections': 'ʻIkai ha sivi',
    'qc.inspectionHistory': 'Hisitōlia Sivi',
    'qc.inspector': 'Tokotaha Sivi',
    'qc.date': 'ʻAho',
    'qc.notes': 'Fakamatala',

    // Team
    'team.addMember': 'Fakalahi Mēmipa',
    'team.assignRow': 'Vahe Laine',
    'team.onBreak': 'Mālōlō',
    'team.active': 'Ngāue',
    'team.inactive': 'Tuku',
    'team.performance': 'Faianga',
    'team.bucketsToday': 'Kato ʻAho ni',
    'team.hoursWorked': 'Houa Ngāue',

    // Alerts
    'alert.hydration': 'Fakamanatu ke Inu',
    'alert.safety': 'Fakatokanga Malu',
    'alert.weather': 'Fakatokanga ʻEa',
    'alert.emergency': 'Fakatuʻutāmaki',
    'alert.acknowledge': 'Tali',
    'alert.moveNow': 'MHUʻINGA: AVE E PUHA NI!',
    'alert.fruitDeteriorating': 'ʻOku kovi e fua',
    'alert.acknowledgeTransport': 'Tali mo Ave',

    // Profile
    'profile.settings': 'Fokotū',
    'profile.language': 'Lea',
    'profile.logout': 'Hū Kituʻa',
    'profile.version': 'Konga',
};
