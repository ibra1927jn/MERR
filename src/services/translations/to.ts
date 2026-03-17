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

  // Error Boundary
  'error.title': 'Naʻe hala ha meʻa',
  'error.description': 'Naʻe fetaulaki e polokalama mo ha hala.',
  'error.reload': 'Toe Lōtini',
  'error.clearCache': 'Fakamaʻa mo Toe Lōtini',

  // Picker Profile
  'picker.todayPerformance': 'Faianga ʻo e ʻaho ni',
  'picker.buckets': 'Kato',
  'picker.speed': '/h Vave',
  'picker.earnings': 'Paʻanga Maʻu',
  'picker.effectiveRate': 'Fua Moʻoni',
  'picker.belowMinimum': 'Ki Lalo',
  'picker.details': 'Fakaikiiki',
  'picker.currentRow': 'Laine Lolotonga',
  'picker.unassigned': 'ʻIkai vahe',
  'picker.harness': 'Fakafatongia',
  'picker.notAssigned': 'ʻIkai vahe',
  'picker.hoursToday': 'Houa ʻAho ni',
  'picker.noTeam': 'ʻIkai ha timi',
  'picker.assigned': 'Kuo vahe',
  'picker.rowNumber': 'Fika Laine',
  'picker.status': 'Tuʻunga',

  // Dashboard
  'dashboard.title': 'Peesi Muʻa',
  'dashboard.totalBuckets': 'Kato Kotoa',
  'dashboard.activePickers': 'Kau Toli Ngāue',
  'dashboard.avgRate': 'Fua Laulau',
  'dashboard.compliance': 'Talangofua',

  // Privacy Consent — NZ Privacy Act 2020
  'privacy.title': 'Fakatokanga ʻo e Puipuiʻi mo e Tānaki Fakamatala',
  'privacy.subtitle':
    'Fakatatau ki he Lao Puipuiʻi Fakamatala ʻa Nuʻusila 2020, ʻoku fie maʻu ke mau fakamatalaʻi kiate koe e founga ʻoku tānaki, ngāueʻaki, mo malu ai ho ngaahi fakamatala fakatāutaha kimuʻa pea ke ngāueʻaki e polokalama ni. Kataki ʻo lau fakalelei.',
  'privacy.section1.title': '1. Fakamatala ʻOku Mau Tānaki (IPP 1–3)',
  'privacy.section1.body':
    'ʻOku tānaki ʻe HarvestPro NZ ʻa e ngaahi fakamatala fakatāutaha ko ʻeni:\n• Hingoa kakato, ʻimeili, mo e ngaahi fakamatala fetuʻutaki\n• Fakamatala ngāue: tūʻunga, faʻahinga aleapau, tuʻunga visa, fika IRD\n• Fakamatala faianga: lau kato/puha, taimi sio, vahe laine\n• Lekooti auai: taimi hū/ʻalu, talangofua mālōlō, houa ngāue\n• Fakaʻilonga meʻangāue maʻa e fakatahataha tuʻo ʻi tuʻa\n• Fakamatala feituʻu ʻi he ngāueʻaki ʻo e mape sone (fili pē)\n\nKo e ngaahi fakamatala ni ʻoku tānaki hangatonu meiate koe mo ho tangata ngāue (pule ngoue).',
  'privacy.section2.title': '2. Taumuʻa ʻo e Tānaki (IPP 1)',
  'privacy.section2.body':
    'Ko ho ngaahi fakamatala fakatāutaha ʻoku tānaki mo ngāueʻaki maʻa:\n• Fika saʻo e vahe, fua tau ʻiuniti, mo e fakalahi totogi maʻulalo ʻo fakatatau ki he Lao Ngaahi Fetuʻutaki Ngāue 2000\n• Vakai ki he talangofua ki he fie maʻu mālōlō mo e taimi kai fakalaō\n• Ngaohi lipoti vahe maʻa e ngaahi founga vahe kuo fakaʻatā (Xero, PaySauce)\n• Muimui ki he faianga utu mo e ngaahi ngāue ngoue\n• Fakapapauʻi e talangofua ki he malu mo e moʻui lelei ʻi he ngāue\n• Ngaohi lekooti sivi ʻoku fie maʻu ʻe he ngaahi lao ngāue ʻa NZ',
  'privacy.section3.title': '3. Tauhi mo e Malu (IPP 5)',
  'privacy.section3.body':
    'Ko ho ngaahi fakamatala ʻoku tauhi ʻi:\n• Ngaahi sēvā ʻi he ʻao ʻoku puleʻi ʻe Supabase (PostgreSQL) mo e Malu Tuʻunga Laine — ko koe pē ʻe lava ke maʻu fakamatala ho ngoue\n• Tauhi fakamalumalu ʻi he meʻangāue (IndexedDB fakaʻilonga AES-256) maʻa e ngāue tuʻo ʻi tuʻa\n• Ko e ngaahi fēhokotaki kotoa ʻoku ngāueʻaki e TLS 1.3 fakaʻilonga\n• Ko e maʻu atu ʻoku puleʻi ʻe he ngaahi fakaʻatā tu ʻunga mo e fakamoʻoni ua maʻa e kau pule\n• Ko e fakamatala paʻanga mo e fakatāutaha ʻoku fakaʻilonga ʻi ho meʻangāue',
  'privacy.section4.title': '4. Ko hai ʻoku Maʻu Atu (IPP 11)',
  'privacy.section4.body':
    'Ko ho ngaahi fakamatala fakatāutaha ʻe lava ke maʻu ʻe:\n• Ho pule ngoue kuo vahe mo e tokotaha pule vahe\n• Kau taʻi timi (fakangatangata ki he fakamatala auai mo vahe ʻa ʻenau timi pē)\n• Pule ngoue maʻa e talangofua fakalaō\n• Ngaahi ʻofisi puleʻanga kapau pē ʻoku fie maʻu ʻe he laō (hangē ko Employment NZ, IRD)\n\nKo ho ngaahi fakamatala ʻE ʻIKAI fakatau, vahevahe ki he kau fakaʻali, pe fakamatalaʻi ki ha taha kehe ʻoku ʻikai taʻu atu ʻi ʻolunga taʻe ʻi ai ho fakaʻatā pau pe ko ha fie maʻu fakalaō.',
  'privacy.section5.title': '5. Ho Ngaahi Totonu (IPP 6–7)',
  'privacy.section5.body':
    'Fakatatau ki he Lao Puipuiʻi Fakamatala ʻa NZ 2020, ʻoku ʻi ai ho totonu ke:\n• Kole ke maʻu e ngaahi fakamatala fakatāutaha kotoa ʻoku tauhi kiate koe\n• Kole ke fakatonutonu ha fakamatala ʻoku ʻikai totonu\n• Fehuʻi ke founga hono ngāueʻaki pe fakahā ho ngaahi fakamatala\n• Fakafoki mei he tānaki fakamatala ʻoku ʻikai fie maʻu (hangē ko e muimui feituʻu)\n• Fakahū ha lāunga ki he Komisina Puipuiʻi ʻa NZ (privacy.org.nz)\n\nKe ngāueʻaki e ngaahi totonu ni, fetuʻutaki ki ho pule ngoue pe ʻimeili ki he tokotaha pule faiga.',
  'privacy.section6.title': '6. Tauhi ʻo e Ngaahi Lekooti',
  'privacy.section6.body':
    'Ko e ngaahi lekooti ngāue ʻoku tauhi maʻa e siʻisiʻi ʻo e taʻu ʻe 6 ʻo hangē ko e fie maʻu ʻe he Lao Ngaahi Fetuʻutaki Ngāue 2000 mo e Lao ʻAho Mālōlō 2003. Hili e taimi ko ia, ʻe lava ke taʻofi pe fakaʻilonga e ngaahi lekooti.\n\nʻI ho ʻalu mei he ngāue, ko ho ʻakauni ngāue ʻe taʻofi ka ko e ngaahi lekooti ʻe tauhi maʻa e taimi fakalaō.',
  'privacy.legalRef':
    'Ko e fakatokanga ni ʻoku tuku atu ʻo fakatatau ki he Lao Puipuiʻi Fakamatala ʻa Nuʻusila 2020 (Ngaahi Tefitoʻi Moʻoni Puipuiʻi Fakamatala 1–6), Lao Ngaahi Fetuʻutaki Ngāue 2000, mo e Lao ʻAho Mālōlō 2003. Ki ha ngaahi fehuʻi, fetuʻutaki ki he ʻOfisi ʻo e Komisina Puipuiʻi ʻa NZ ʻi privacy.org.nz.',
  'privacy.acceptButton': 'Kuó u Lau mo Tali e Fakatokanga Puipuiʻi ni',
  'privacy.submitting': 'ʻOku lekooti e tali...',
  'privacy.scrollToRead': 'Kataki ʻo hifo ki lalo ke lau e fakatokanga kakato',
  'privacy.footer':
    'Ko ho tali ʻe lekooti ʻaki ha taimi. ʻE lava ke ke kole ha tatau ʻo e fakatokanga ni ʻi ha taimi pē.',
  'privacy.error': 'ʻIkai lava ke lekooti e tali. Kataki ʻo toe feinga pe fetuʻutaki ki ho pule.',
};
