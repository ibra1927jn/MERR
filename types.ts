export enum Role {
  MANAGER = 'manager',
  TEAM_LEADER = 'team_leader',
  RUNNER = 'runner'
}

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: Role; // Usa el Enum Role
  is_active: boolean;
  orchard_id?: string;
  team_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Picker {
  id: string; // UUID from DB
  picker_id: string; // "402" - ID for Sticker/QR
  name: string; // "Liam O."
  avatar: string; // Initials or URL
  current_row: number;
  total_buckets_today: number;
  hours: number;
  status: 'active' | 'break' | 'on_break' | 'issue' | 'inactive' | 'suspended';
  safety_verified: boolean; // Was onboarded
  qcStatus: number[]; // 0 = bad, 1 = good, 2 = warning
  harness_id?: string;
  team_leader_id?: string;
  orchard_id?: string;
  role?: string; // Added for Manager UI filtering
}

export interface Bin {
  id: string; // "#4092"
  status: 'empty' | 'in-progress' | 'full' | 'collected';
  fillPercentage: number;
  type: 'Standard' | 'Export' | 'Process';
  assignedRunner?: string;
  row?: string;
  sunExposureStart?: number; // Timestamp
}

export interface Notification {
  id: string;
  from: string;
  message: string;
  priority: 'normal' | 'high';
  timestamp: string;
  read: boolean;
}

export interface HarvestSettings {
  min_wage_rate: number;
  piece_rate: number;
  min_buckets_per_hour: number;
  target_tons: number;
}

export interface HarvestState {
  currentUser: {
    name: string;
    role: Role | null;
    avatarUrl?: string;
    id?: string;
  };
  crew: Picker[];
  bins: Bin[];
  notifications: Notification[];
  stats: {
    totalBuckets: number;
    payEstimate: number; // In thousands, e.g. 4.2
    tons: number;
    velocity: number; // bkt/hr
    goalVelocity: number;
  };
  settings?: HarvestSettings;
  orchard?: {
    id: string;
    name?: string;
    total_rows?: number;
  };
  bucketRecords: any[]; // Stream for HeatMap
}

// View Mapped Interface
export interface PickerPerformance {
  picker_id: string;
  picker_name: string;
  harness_id: string;
  team_id?: string;
  orchard_id: string;
  total_buckets: number;
  first_scan: string;
  last_scan: string;
  hours_worked: number;
  buckets_per_hour: number;
  status_shield: 'safe' | 'warning' | 'critical';
}

export interface BucketEvent {
  id?: string;
  picker_id: string;
  orchard_id?: string;
  device_id?: string;
  row_number?: number;
  quality_grade: 'A' | 'B' | 'C' | 'reject';
  scanned_at?: string; // ISO timestamp
}

export type MessagePriority = 'normal' | 'high' | 'urgent';

export interface Message {
  id: string;
  channel_type: 'direct' | 'team' | 'broadcast';
  sender_id: string;
  recipient_id?: string;
  group_id?: string;
  content: string;
  created_at: string;
  read_by: string[];
  priority: MessagePriority;
  orchard_id?: string;
}

export interface Broadcast {
  id: string;
  orchard_id: string;
  sender_id: string;
  title: string;
  content: string;
  priority: MessagePriority;
  target_roles: Role[];
  acknowledged_by: string[];
  created_at: string;
}

export interface BucketRecord {
  id: string;
  timestamp: string;
  pickerId: string;
  binId: string;
  // Extended props for HeatMap
  coords?: { lat: number; lng: number };
  bucket_count?: number;
}

export type PickerStatus = 'active' | 'break' | 'on_break' | 'issue' | 'inactive' | 'suspended';

export interface Alert {
  id: string;
  type: 'compliance' | 'performance' | 'system';
  message: string;
  severity: 'low' | 'medium' | 'high';
  title?: string; // Add title as optional or required based on usage
  description?: string;
  timestamp: string;
}

export interface QualityInspection {
  id: string;
  picker_id: string;
  quality_grade: 'A' | 'B' | 'C' | 'reject';
  created_at: string;
  inspector_id: string;
  notes?: string;
  photo_url?: string;
}

// === CONSTANTS ===
export const MINIMUM_WAGE = 23.15; // NZD Minimum Wage
export const PIECE_RATE = 6.50;    // Per bucket
export const MAX_BUCKETS_PER_BIN = 48;
export const DEFAULT_START_TIME = '07:00';

export interface RowAssignment {
  id: string;
  row_number: number;
  side: 'north' | 'south';
  assigned_pickers: string[];
  completion_percentage: number;
}

export interface HarvestPrediction {
  estimatedCompletionTime: string;
  probabilityOfSuccess: number;
  predictedFinalTons: number;
  riskFactors: string[];
  recommendations: string[];
  confidence: number;
  // Legacy support if needed
  predicted_tons?: number;
  weather_impact?: string;
  recommended_action?: string;
}

export interface PredictionParams {
  currentTons: number;
  targetTons: number;
  velocity: number; // buckets per hour
  hoursRemaining: number;
  crewSize: number;
  weatherConditions?: string;
  blockProgress?: number;
}