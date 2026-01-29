// =============================================
// TIPOS UNIFICADOS PARA HARVESTPRO NZ
// =============================================

// ROLES
export enum Role {
  MANAGER = 'MANAGER',
  TEAM_LEADER = 'TEAM_LEADER',
  RUNNER = 'RUNNER'
}

// USER ROLES (para DB)
export type UserRole = 'manager' | 'team_leader' | 'picker' | 'bucket_runner' | 'tractor_driver' | 'qc_inspector';

// ESTADOS
export type PickerStatus = 'active' | 'on_break' | 'inactive' | 'suspended';
export type OnboardingStatus = 'pending' | 'onboarded' | 'incomplete';
export type CollectionStatus = 'pending' | 'collected' | 'delivered';
export type RunnerStatus = 'available' | 'collecting' | 'delivering' | 'on_break' | 'offline';
export type AlertType = 'hydration' | 'safety' | 'weather' | 'performance' | 'logistics' | 'emergency';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type MessagePriority = 'normal' | 'high' | 'urgent';
export type RowStatus = 'assigned' | 'in_progress' | 'completed' | 'skipped';
export type DaySetupStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type BinStatus = 'empty' | 'in-progress' | 'full' | 'collected';
export type BinType = 'Standard' | 'Export' | 'Process';

// =============================================
// INTERFACES PRINCIPALES
// =============================================

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  harness_number?: string;
  picker_id?: string;
  team_id?: string;
  orchard_id?: string;
  is_active: boolean;
  last_seen?: string;
  created_at: string;
  updated_at: string;
}

export interface Orchard {
  id: string;
  code: string;
  name: string;
  location?: string;
  region?: string;
  manager_id?: string;
  total_blocks: number;
  total_rows: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Block {
  id: string;
  orchard_id: string;
  code: string;
  name?: string;
  variety?: string;
  total_rows: number;
  row_start?: number;
  row_end?: number;
  is_active: boolean;
  created_at: string;
}

export interface Team {
  id: string;
  orchard_id: string;
  name: string;
  code?: string;
  team_leader_id?: string;
  current_block_id?: string;
  current_row?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  team_leader?: AppUser;
  current_block?: Block;
}

export interface DaySetup {
  id: string;
  orchard_id: string;
  setup_date: string;
  block_id?: string;
  variety?: string;
  target_size?: string;
  target_color?: string;
  bin_type: string;
  min_wage_rate: number;
  piece_rate: number;
  min_buckets_per_hour: number;
  status: DaySetupStatus;
  started_at?: string;
  ended_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  block?: Block;
}

export interface Inspection {
  id: string;
  picker_id: string;
  inspector_id: string;
  bucket_id?: string; // Optional linkage to specific bucket
  result: 'excellent' | 'good' | 'warning' | 'reject';
  defects: string[]; // e.g., ['bruising', 'stemless', 'undersize']
  notes?: string;
  photo_url?: string;
  created_at: string;
}

export interface Picker {
  id: string;
  name: string;
  avatar: string;
  role: string;
  employeeId: string;
  harnessId?: string;
  onboarded: boolean;
  buckets: number;
  hours?: number;
  row?: number;
  status: PickerStatus;
  qcStatus: Inspection[]; // Now uses Inspection interface
}

export interface BucketRecord {
  id: string;
  day_setup_id: string;
  picker_id: string;
  team_id?: string;
  block_id?: string;
  row_number?: number;
  bucket_count: number;
  quality_grade?: 'A' | 'B' | 'C' | 'reject';
  collected_by?: string;
  collection_status: CollectionStatus;
  scanned_at: string;
  collected_at?: string;
  delivered_at?: string;
  notes?: string;
  created_at: string;
  picker?: Picker;
}

export interface BucketRunner {
  id: string;
  user_id?: string;
  orchard_id: string;
  runner_id: string;
  full_name: string;
  status: RunnerStatus;
  current_load: number;
  max_capacity: number;
  assigned_team_id?: string;
  last_collection_at?: string;
  total_collections_today: number;
  created_at: string;
  updated_at: string;
  assigned_team?: Team;
}

export interface RowAssignment {
  id: string;
  day_setup_id?: string;
  block_id?: string;
  team_id?: string;
  row_number: number;
  side?: 'north' | 'south' | 'both';
  status: RowStatus;
  assigned_pickers: string[];
  completion_percentage: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BreakLog {
  id: string;
  day_setup_id: string;
  picker_id: string;
  break_type: 'hydration' | 'rest' | 'lunch' | 'bathroom' | 'other';
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  logged_by?: string;
  is_overdue: boolean;
  notes?: string;
  created_at: string;
}

export interface Message {
  id: string;
  orchard_id: string;
  sender_id: string;
  channel_type: 'broadcast' | 'team' | 'direct' | 'logistics' | 'qc';
  channel_id: string;
  content: string;
  priority: MessagePriority;
  has_attachment: boolean;
  attachment_url?: string;
  read_by: string[];
  created_at: string;
  sender?: AppUser;
}

export interface Broadcast {
  id: string;
  orchard_id: string;
  sender_id: string;
  title: string;
  content: string;
  priority: MessagePriority;
  target_roles: UserRole[];
  target_teams?: string[];
  acknowledged_by: string[];
  expires_at?: string;
  created_at: string;
  sender?: AppUser;
}

export interface Alert {
  id: string;
  orchard_id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  description?: string;
  related_picker_id?: string;
  related_team_id?: string;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  related_picker?: Picker;
  related_team?: Team;
}

export interface Bin {
  id: string;
  status: BinStatus;
  fillPercentage: number;
  type: BinType;
  assignedRunner?: string;
  row?: string;
  timestamp: string;
}

export interface ChatMessage {
  id: number;
  text: string;
  image?: string;
  sender: 'Me' | 'Other';
  senderName: string;
  timestamp: string;
}

export interface ChatThread {
  id: number;
  name: string;
  members: string[];
  lastMsg: string;
  time: string;
  unread: boolean;
  messages: ChatMessage[];
}

export interface InventoryState {
  emptyBins: number;
  binsOfBuckets: number;
}

export interface HarvestSettings {
  bucketRate: number;
  targetTons: number;
  startTime: string;
  teams: string[];
}

// =============================================
// CONSTANTES (FALLBACKS)
// =============================================
// These should now be retrieved from DaySetup in context
export const MINIMUM_WAGE = 23.50;
export const MAX_BUCKETS_PER_BIN = 72;
export const PIECE_RATE = 6.50;
export const MIN_BUCKETS_PER_HOUR = MINIMUM_WAGE / PIECE_RATE; // ~3.6