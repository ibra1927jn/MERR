// =============================================
// SAMOAN TRANSLATIONS (sm)
// =============================================

export const translations: Record<string, string> = {
  // Common
  'common.loading': 'O loʻo faʻapipiʻi...',
  'common.save': 'Sefe',
  'common.cancel': 'Faʻaleaoga',
  'common.close': 'Tapuni',
  'common.confirm': 'Faʻamaonia',
  'common.delete': 'Tape',
  'common.edit': 'Faʻasaʻo',
  'common.add': 'Faʻaopoopo',
  'common.search': 'Suʻe',
  'common.filter': 'Filiga',
  'common.refresh': 'Faʻafouina',
  'common.back': 'Toe foi',
  'common.next': 'Isi',
  'common.done': 'Ua maeʻa',
  'common.yes': 'Ioe',
  'common.no': 'Leai',
  'common.ok': 'Ua lelei',
  'common.error': 'Mea sese',
  'common.success': 'Manuia',
  'common.warning': 'Lapataiga',

  // Navigation
  'nav.logistics': 'Faʻasoa',
  'nav.runners': 'Tagata tamo',
  'nav.warehouse': 'Faleoloa',
  'nav.messaging': 'Fesoʻotaʻiga',
  'nav.team': 'Au',
  'nav.rows': 'Laina',
  'nav.quality': 'Lelei',
  'nav.settings': 'Faʻatulagaga',

  // Headers
  'header.logisticsHub': 'Nofoaga Faʻasoa',
  'header.orchardRunners': 'Tagata Tamo o le Togālaau',
  'header.warehouseInventory': 'Mea i le Faleoloa',
  'header.messagingHub': 'Nofoaga Fesoʻotaʻi',
  'header.teamManagement': 'Puleaga o le Au',
  'header.rowAssignments': 'Tofiaga o Laina',

  // Offline Banner
  'offline.syncPending': 'O Faʻatali le Tuʻufaʻatasia',
  'offline.updated': 'Faʻafouina {{time}} talu ai',

  // Logistics View
  'logistics.bucketsCollected': 'Pakete Ua Aoina',
  'logistics.full': 'Tumu',
  'logistics.binFull': 'Pusa Tumu',
  'logistics.active': 'Galue',
  'logistics.ready': 'Sauni',
  'logistics.approachingLimit': '⚠️ O latalata i le 72 pakete',
  'logistics.prepareSwap': 'Sauni e sui le pusa',
  'logistics.limitReached': '🚫 UA OʻO I LE TAPULAʻA - AUA LE TOE FAʻAOPOOPO',
  'logistics.closeImmediately': 'Tapuni vave le pusa e puipuia fualaau',

  // Sun Exposure
  'sun.exposure': 'Susulu o le La',
  'sun.critical': '🚨 TAUTEʻI!',
  'sun.safeLevel': 'Tulaga Saogalemu',
  'sun.moveToShade': 'Aveina i le paolo!',

  // Supply Management
  'supply.management': 'Puleaga o Mea',
  'supply.emptyBins': 'Pusa Avanoa',
  'supply.fullBins': 'Pusa Tumu',
  'supply.low': '⚠️ Maualalo',
  'supply.ok': 'Ua lelei',
  'supply.requestRefill': 'Talosaga mo Mea',
  'supply.refillRequested': '📦 Ua talosagaina mea!',
  'supply.binsEnRoute': '✅ {{count}} pusa avanoa o loʻo sau',
  'supply.eta': '🚛 Taimi taunuʻu: {{minutes}} minute mai le fale',

  // Runners
  'runners.active': 'Tagata Tamo Galue',
  'runners.addRunner': 'Faʻaopopo Tamo',
  'runners.noActive': 'Leai se Tamo Galue',
  'runners.addFirst': 'Faʻaopopo Muamua Tamo',
  'runners.addToTrack': 'Faʻaopopo tagata tamo e siaki',
  'runners.manageRunner': 'Puleaina le Tamo',
  'runners.started': 'Amata {{time}}',
  'runners.assignment': 'Tofiaga',
  'runners.noAssignment': 'Leai se tofiaga',
  'runners.buckets': 'Pakete',
  'runners.bins': 'Pusa',
  'runners.orchardMap': 'Faafanua Togālaau',
  'runners.gpsComingSoon': 'GPS i taimi moni e sau',

  // Warehouse
  'warehouse.harvestedStock': 'Mea Ua Seleseleina',
  'warehouse.fullCherryBins': 'Pusa Tipolo Tumu',
  'warehouse.filled': 'tumu',
  'warehouse.manualAdjustment': 'Suiga Lima:',
  'warehouse.emptyBinsAvailable': 'Pusa Avanoa',
  'warehouse.waitingTransport': 'O Faʻatali le Feaveaʻi',
  'warehouse.critical': '🚨 TAUTEʻI: Ua uma pusa avanoa!',
  'warehouse.lowStock': '⚠️ Lapataiga mea maualalo',
  'warehouse.requestResupply': 'Talosaga vave mea mai le fale',
  'warehouse.nextTruck': 'Loli o le a sau',
  'warehouse.scheduledArrival': 'E taunuʻu i {{minutes}} minute mai le Fale A',
  'warehouse.requestTransport': 'Talosaga Feaveaʻi',

  // Scanner
  'scanner.scanBin': 'Siaki Pusa',
  'scanner.scanSticker': 'Siaki Pepelo',
  'scanner.binScanned': '✅ Ua siakiina le Pusa',
  'scanner.bucketRegistered': '✅ Ua resitala le pakete!',

  // Quality Control
  'qc.inspection': 'Siakiga Lelei',
  'qc.grade': 'Tulaga',
  'qc.good': 'Lelei',
  'qc.warning': 'Lapataiga',
  'qc.bad': 'Leaga',
  'qc.viewHistory': 'Vaʻai Tala o Siakiga',
  'qc.noInspections': 'Leai ni siakiga',
  'qc.inspectionHistory': 'Tala o Siakiga',
  'qc.inspector': 'Tagata Siaki',
  'qc.date': 'Aso',
  'qc.notes': 'Tusitusiga',

  // Team
  'team.addMember': 'Faʻaopopo Tagata',
  'team.assignRow': 'Tofia Laina',
  'team.onBreak': 'O loʻo Malolo',
  'team.active': 'Galue',
  'team.inactive': 'Le galue',
  'team.performance': 'Faatinoga',
  'team.bucketsToday': 'Pakete i Aso nei',
  'team.hoursWorked': 'Itula na Galue',

  // Alerts
  'alert.hydration': 'Faʻamanatu e Inu',
  'alert.safety': 'Lapataiga Saogalemu',
  'alert.weather': 'Lapataiga Tau',
  'alert.emergency': 'Faʻalavelave',
  'alert.acknowledge': 'Talia',
  'alert.moveNow': 'TAUTEʻI: AVE LE PUSA NEI!',
  'alert.fruitDeteriorating': 'O loʻo leaga fualaau',
  'alert.acknowledgeTransport': 'Talia ma Aveina',

  // Profile
  'profile.settings': 'Faʻatulagaga',
  'profile.language': 'Gagana',
  'profile.logout': 'Alu ese',
  'profile.version': 'Lomiga',

  // Error Boundary
  'error.title': 'Ua i ai se mea sese',
  'error.description': 'Ua maua e le polokalame se mea sese.',
  'error.reload': 'Toe Faʻapipiʻi',
  'error.clearCache': 'Faʻamamā ma Toe Faʻapipiʻi',

  // Picker Profile
  'picker.todayPerformance': 'Faatinoga i Aso nei',
  'picker.buckets': 'Pakete',
  'picker.speed': '/itu Vave',
  'picker.earnings': 'Tupe Maua',
  'picker.effectiveRate': 'Fua Moni',
  'picker.belowMinimum': 'I Lalo',
  'picker.details': 'Faʻamatalaga',
  'picker.currentRow': 'Laina nei',
  'picker.unassigned': 'Le tofia',
  'picker.harness': 'Mea Nofo',
  'picker.notAssigned': 'Le tofia',
  'picker.hoursToday': 'Itula i Aso nei',
  'picker.noTeam': 'Leai se au',
  'picker.assigned': 'Tofia',
  'picker.rowNumber': 'Numera Laina',
  'picker.status': 'Tulaga',

  // Dashboard
  'dashboard.title': 'Vaega Autu',
  'dashboard.totalBuckets': 'Aofaʻi Pakete',
  'dashboard.activePickers': 'Tagata Selesele Galue',
  'dashboard.avgRate': 'Averesi Fua',
  'dashboard.compliance': 'Usitaʻi',

  // Privacy Consent — NZ Privacy Act 2020
  'privacy.title': 'Faʻasalalauga o le Puipuiga o Faʻamaumauga ma Aoina o Faʻamatalaga',
  'privacy.subtitle':
    'E tusa ai ma le Tulafono o le Puipuiga o Faʻamaumauga a Niu Sila 2020, e manaʻomia matou e faʻailoa atu ia te oe le auala e aoina ai, faʻaaogaina, ma puipuia ai ou faʻamatalaga tumaoti aʻo leʻi e faʻaaogaina lenei faiga. Faʻamolemole faitau lelei mea nei.',
  'privacy.section1.title': '1. Faʻamatalaga Matou te Aoina (IPP 1–3)',
  'privacy.section1.body':
    'E aoina e HarvestPro NZ faʻamatalaga tumaoti nei:\n• Igoa atoa, imeli, ma faʻamatalaga fesoʻotaʻi\n• Faʻamatalaga faigaluega: tulaga, ituaiga konekarate, tulaga visa, numera IRD\n• Faʻamatalaga o galuega: faitau aiga pakete/pusa, taimi o siakiga, tofiaga o laina\n• Faʻamaumauga o le auai: taimi ulufale/tuʻua, usitaʻi i malologa, itula na galueina\n• Faʻailoga o masini mo le tuʻufaʻatasia offline\n• Faʻamatalaga nofoaga pe a faʻaaogaina le faafanua o sone (filifilia)\n\nO nei faʻamatalaga e aoina saʻo mai ia te oe ma mai lou tagata faigaluega (le faitoʻaga).',
  'privacy.section2.title': '2. Faʻamoemoega o le Aoina (IPP 1)',
  'privacy.section2.body':
    'O ou faʻamatalaga tumaoti e aoina ma faʻaaogaina mo:\n• Faʻatusatusaga saʻo o totogi, fua tau iuni, ma faʻaleleia o le totogi maualalo e tusa ai ma le Tulafono o Sootaga Faigaluega 2000\n• Vaʻai i le usitaʻi o manaʻoga faaletulafono o malolo ma taimi aʻai\n• Fatuina o lipoti totogi mo faʻaulufaleina i faiga totogi faʻatagaina (Xero, PaySauce)\n• Siaki le gaosiga o le seleselega ma tapenaga o togālaau\n• Faʻamautinoa le usitaʻi o le saogalemu ma le soifua maloloina i galuega\n• Fatuina o faʻamaumauga suesuega e manaʻomia e tulafono faigaluega a NZ',
  'privacy.section3.title': '3. Teuina ma le Puipuiga (IPP 5)',
  'privacy.section3.body':
    'O au faʻamaumauga e teuina i:\n• Komepiuta i le ao e faʻatautaia e Supabase (PostgreSQL) faʻatasi ai ma le Puipuiga i Tulaga Laina — e mafai ona e maua faʻamaumauga o lou togālaau na tofia ai\n• Teuina i masini (IndexedDB faʻailoga AES-256) mo le mafai offline\n• Fesoʻotaʻiga uma e faʻaaoga TLS 1.3 faʻailoga\n• O le maua atu e pulea e aia e faʻavae i tulaga ma le faʻamaonia lua mo pule\n• Faʻamaumauga tupe ma tagata tumaoti e faʻailogaina i lou masini',
  'privacy.section4.title': '4. O Ai e Maua (IPP 11)',
  'privacy.section4.body':
    'O ou faʻamatalaga tumaoti e mafai ona maua e:\n• Lou pule togālaau tofia ma le tagata pule totogi\n• Taʻitaʻi o au (faʻatapulaʻa i faʻamaumauga auai ma tofiaga o la latou au)\n• Le fai faitoʻaga mo le usitaʻi faaletulafono\n• Ofisa o malo pe a manaʻomia e le tulafono (pei o Employment NZ, IRD)\n\nO au faʻamaumauga E LE faʻatauina, faʻasoa i tagata faʻasalalau, pe faʻailoa i soʻo se isi vaega e leʻi taʻua i luga e aunoa ma lou faʻatagaga manino pe o se manaʻoga faaletulafono.',
  'privacy.section5.title': '5. Ou Aia Tatau (IPP 6–7)',
  'privacy.section5.body':
    'E tusa ai ma le Tulafono o le Puipuiga o Faʻamaumauga a NZ 2020, e iai ou aia e:\n• Talosaga e maua faʻamatalaga tumaoti uma o loʻo teuina e uiga ia te oe\n• Talosaga e faʻasaʻo soʻo se faʻamatalaga sese\n• Fesili pe faʻapefea ona faʻaaogaina pe faʻailoa ou faʻamatalaga\n• Aveese mai le aoina o faʻamaumauga e le taua (pei o le siaki nofoaga)\n• Tuuina atu se faʻasea i le Komesina o le Puipuiga o Faʻamaumauga a NZ (privacy.org.nz)\n\nMo le faʻatinoina o nei aia, faʻafesoʻotaʻi lou pule togālaau pe imeli le tagata pule faiga.',
  'privacy.section6.title': '6. Teuina o Faʻamaumauga',
  'privacy.section6.body':
    'O faʻamaumauga faigaluega e teuina mo le itiiti ifo 6 tausaga e pei ona manaʻomia e le Tulafono o Sootaga Faigaluega 2000 ma le Tulafono o Aso Malolo 2003. Pe a mavae lenei vaitaimi, e mafai ona tapeina pe faʻailoailogaina faʻamaumauga.\n\nPe a e tuua le galuega, o lou teugatupe galue o le a tape ae o faʻamaumauga o le a teuina mo le vaitaimi faaletulafono.',
  'privacy.legalRef':
    'O lenei faʻasalalauga e tuuina atu e tusa ai ma le Tulafono o le Puipuiga o Faʻamaumauga a Niu Sila 2020 (Mataupu Faavae o le Puipuiga o Faʻamatalaga 1–6), le Tulafono o Sootaga Faigaluega 2000, ma le Tulafono o Aso Malolo 2003. Mo fesili, faʻafesoʻotaʻi le Ofisa o le Komesina o le Puipuiga o Faʻamaumauga a NZ i privacy.org.nz.',
  'privacy.acceptButton': 'Ua Ou Faitauina ma Talia Lenei Faʻasalalauga o le Puipuiga',
  'privacy.submitting': 'O loʻo faʻamauina le taliaina...',
  'privacy.scrollToRead': 'Faʻamolemole siʻi i lalo e faitau le faʻasalalauga atoa',
  'privacy.footer':
    'O lou taliaina o le a faʻamauina faʻatasi ma le taimi. E mafai ona e talosagaina se kopi o lenei faʻasalalauga i soʻo se taimi.',
  'privacy.error':
    'Ua le mafai ona faʻamauina le taliaina. Faʻamolemole toe taumafai pe faʻafesoʻotaʻi lou pule.',
};
