// =============================================
// ENGLISH TRANSLATIONS (Base)
// =============================================

export const translations: Record<string, string> = {
  // Common
  'common.loading': 'Loading...',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.confirm': 'Confirm',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.add': 'Add',
  'common.search': 'Search',
  'common.filter': 'Filter',
  'common.refresh': 'Refresh',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.done': 'Done',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.ok': 'OK',
  'common.error': 'Error',
  'common.success': 'Success',
  'common.warning': 'Warning',

  // Navigation
  'nav.logistics': 'Logistics',
  'nav.runners': 'Runners',
  'nav.warehouse': 'Warehouse',
  'nav.messaging': 'Messaging',
  'nav.team': 'Team',
  'nav.rows': 'Rows',
  'nav.quality': 'Quality',
  'nav.settings': 'Settings',

  // Headers
  'header.logisticsHub': 'Logistics Hub',
  'header.orchardRunners': 'Orchard Runners',
  'header.warehouseInventory': 'Warehouse Inventory',
  'header.messagingHub': 'Messaging Hub',
  'header.teamManagement': 'Team Management',
  'header.rowAssignments': 'Row Assignments',

  // Offline Banner
  'offline.syncPending': 'Offline Sync Pending',
  'offline.updated': 'Updated {{time}} ago',

  // Logistics View
  'logistics.bucketsCollected': 'Buckets Collected',
  'logistics.full': 'Full',
  'logistics.binFull': 'Bin Full',
  'logistics.active': 'Active',
  'logistics.ready': 'Ready',
  'logistics.approachingLimit': '⚠️ Approaching 72-bucket limit',
  'logistics.prepareSwap': 'Prepare for bin swap',
  'logistics.limitReached': '🚫 LIMIT REACHED - DO NOT ADD MORE',
  'logistics.closeImmediately': 'Close bin immediately to prevent fruit damage',

  // Sun Exposure
  'sun.exposure': 'Sun Exposure',
  'sun.critical': '🚨 CRITICAL!',
  'sun.safeLevel': 'Safe Level',
  'sun.moveToShade': 'Move to shade!',

  // Supply Management
  'supply.management': 'Supply Management',
  'supply.emptyBins': 'Empty Bins',
  'supply.fullBins': 'Full Bins',
  'supply.low': '⚠️ Low',
  'supply.ok': 'OK',
  'supply.requestRefill': 'Request Refill',
  'supply.refillRequested': '📦 Refill requested!',
  'supply.binsEnRoute': '✅ {{count}} empty bins en route',
  'supply.eta': '🚛 ETA: {{minutes}} minutes from depot',

  // Runners
  'runners.active': 'Active Runners',
  'runners.addRunner': 'Add Runner',
  'runners.noActive': 'No Runners Active',
  'runners.addFirst': 'Add First Runner',
  'runners.addToTrack': 'Add runners to track their activity',
  'runners.manageRunner': 'Manage Runner',
  'runners.started': 'Started {{time}}',
  'runners.assignment': 'Assignment',
  'runners.noAssignment': 'No assignment',
  'runners.buckets': 'Buckets',
  'runners.bins': 'Bins',
  'runners.orchardMap': 'Orchard Map',
  'runners.gpsComingSoon': 'Real-time GPS tracking coming soon',

  // Warehouse
  'warehouse.harvestedStock': 'Harvested Stock',
  'warehouse.fullCherryBins': 'Full Cherry Bins',
  'warehouse.filled': 'filled',
  'warehouse.manualAdjustment': 'Manual Adjustment:',
  'warehouse.emptyBinsAvailable': 'Empty Bins Available',
  'warehouse.waitingTransport': 'Waiting Transport',
  'warehouse.critical': '🚨 CRITICAL: Empty bins depleted!',
  'warehouse.lowStock': '⚠️ Low stock alert',
  'warehouse.requestResupply': 'Request immediate resupply from depot',
  'warehouse.nextTruck': 'Next Resupply Truck',
  'warehouse.scheduledArrival': 'Scheduled arrival in {{minutes}} mins from Depot A',
  'warehouse.requestTransport': 'Request Transport',

  // Scanner
  'scanner.scanBin': 'Scan Bin',
  'scanner.scanSticker': 'Scan Sticker',
  'scanner.binScanned': '✅ Bin Scanned',
  'scanner.bucketRegistered': '✅ Bucket registered!',

  // Quality Control
  'qc.inspection': 'Quality Inspection',
  'qc.grade': 'Grade',
  'qc.good': 'Good',
  'qc.warning': 'Warning',
  'qc.bad': 'Bad',
  'qc.viewHistory': 'View Inspection History',
  'qc.noInspections': 'No inspections yet',
  'qc.inspectionHistory': 'Inspection History',
  'qc.inspector': 'Inspector',
  'qc.date': 'Date',
  'qc.notes': 'Notes',

  // Team
  'team.addMember': 'Add Team Member',
  'team.assignRow': 'Assign Row',
  'team.onBreak': 'On Break',
  'team.active': 'Active',
  'team.inactive': 'Inactive',
  'team.performance': 'Performance',
  'team.bucketsToday': 'Buckets Today',
  'team.hoursWorked': 'Hours Worked',

  // Alerts
  'alert.hydration': 'Hydration Reminder',
  'alert.safety': 'Safety Alert',
  'alert.weather': 'Weather Alert',
  'alert.emergency': 'Emergency',
  'alert.acknowledge': 'Acknowledge',
  'alert.moveNow': 'CRITICAL: MOVE BIN NOW!',
  'alert.fruitDeteriorating': 'Fruit quality deteriorating',
  'alert.acknowledgeTransport': 'Acknowledge & Transport',

  // Profile
  'profile.settings': 'Settings',
  'profile.language': 'Language',
  'profile.logout': 'Log Out',
  'profile.version': 'Version',

  // Error Boundary
  'error.title': 'Something went wrong',
  'error.description': 'The application encountered an unexpected error.',
  'error.reload': 'Reload Application',
  'error.clearCache': 'Clear Cache & Reload',

  // Picker Profile
  'picker.todayPerformance': "Today's Performance",
  'picker.buckets': 'Buckets',
  'picker.speed': '/hr Speed',
  'picker.earnings': 'Earnings',
  'picker.effectiveRate': 'Effective Rate',
  'picker.belowMinimum': 'Below',
  'picker.details': 'Details',
  'picker.currentRow': 'Current Row',
  'picker.unassigned': 'Unassigned',
  'picker.harness': 'Harness',
  'picker.notAssigned': 'Not assigned',
  'picker.hoursToday': 'Hours Today',
  'picker.noTeam': 'No team',
  'picker.assigned': 'Assigned',
  'picker.rowNumber': 'Row Number',
  'picker.status': 'Status',

  // Dashboard
  'dashboard.title': 'Dashboard',
  'dashboard.totalBuckets': 'Total Buckets',
  'dashboard.activePickers': 'Active Pickers',
  'dashboard.avgRate': 'Avg Rate',
  'dashboard.compliance': 'Compliance',

  // Privacy Consent — NZ Privacy Act 2020
  'privacy.title': 'Privacy & Data Collection Notice',
  'privacy.subtitle':
    'Under the New Zealand Privacy Act 2020, we are required to inform you about how your personal information is collected, used, and protected before you use this system. Please read the following carefully.',
  'privacy.section1.title': '1. Information We Collect (IPP 1–3)',
  'privacy.section1.body':
    'HarvestPro NZ collects the following personal information:\n• Full name, email address, and contact details\n• Employment information: role, contract type, visa status, IRD number\n• Work performance data: bucket/bin counts, scanning timestamps, row assignments\n• Attendance records: check-in/out times, break compliance, hours worked\n• Device identifiers for offline synchronisation\n• Location data when using the orchard zone map (optional)\n\nThis information is collected directly from you and from your employer (the orchard operator) for the purposes described below.',
  'privacy.section2.title': '2. Purpose of Collection (IPP 1)',
  'privacy.section2.body':
    'Your personal information is collected and used for:\n• Accurate calculation of wages, piece rates, and minimum wage top-ups as required by the Employment Relations Act 2000\n• Monitoring compliance with statutory rest and meal break requirements\n• Generating payroll reports for export to authorised payroll systems (Xero, PaySauce)\n• Tracking harvest productivity and orchard operations\n• Ensuring workplace health and safety compliance\n• Producing audit trails required by NZ employment regulations',
  'privacy.section3.title': '3. Storage & Security (IPP 5)',
  'privacy.section3.body':
    'Your data is stored in:\n• Cloud servers operated by Supabase (PostgreSQL) with Row-Level Security — you can only access data for your assigned orchard\n• Local device storage (encrypted IndexedDB with AES-256) for offline capability\n• All data transmissions use TLS 1.3 encryption\n• Access is controlled by role-based permissions and multi-factor authentication for managers\n• Financial and personal data fields are encrypted at rest on your device',
  'privacy.section4.title': '4. Who Has Access (IPP 11)',
  'privacy.section4.body':
    'Your personal information may be accessed by:\n• Your designated orchard manager and payroll administrator\n• Team leaders (limited to attendance and assignment data for their crew only)\n• The orchard operator for legal and regulatory compliance\n• Government agencies only when required by law (e.g., Employment NZ, IRD)\n\nYour data will NOT be sold, shared with advertisers, or disclosed to any third party not listed above without your explicit consent or a lawful requirement.',
  'privacy.section5.title': '5. Your Rights (IPP 6–7)',
  'privacy.section5.body':
    'Under the NZ Privacy Act 2020, you have the right to:\n• Request access to all personal information held about you\n• Request correction of any inaccurate information\n• Ask how your information has been used or disclosed\n• Withdraw from non-essential data collection (e.g., location tracking)\n• Lodge a complaint with the NZ Privacy Commissioner (privacy.org.nz)\n\nTo exercise these rights, contact your orchard manager or email the system administrator.',
  'privacy.section6.title': '6. Data Retention',
  'privacy.section6.body':
    'Employment records are retained for a minimum of 6 years as required by the Employment Relations Act 2000 and the Holidays Act 2003. After this period, records may be securely deleted or anonymised.\n\nWhen you leave employment, your active account will be deactivated but records are retained for the statutory period.',
  'privacy.legalRef':
    'This notice is issued in accordance with the New Zealand Privacy Act 2020 (Information Privacy Principles 1–6), the Employment Relations Act 2000, and the Holidays Act 2003. For questions, contact the NZ Office of the Privacy Commissioner at privacy.org.nz.',
  'privacy.acceptButton': 'I Have Read and Accept This Privacy Notice',
  'privacy.submitting': 'Recording consent...',
  'privacy.scrollToRead': 'Please scroll down to read the full notice',
  'privacy.footer':
    'Your consent will be recorded with a timestamp. You may request a copy of this notice at any time.',
  'privacy.error': 'Failed to record consent. Please try again or contact your manager.',
};
