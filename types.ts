export enum Role {
  MANAGER = 'manager',
  TEAM_LEADER = 'team_leader',
  RUNNER = 'runner',
  QA_INSPECTOR = 'qa_inspector'
}

export type UserRole = 'manager' | 'team_leader' | 'bucket_runner' | 'qa_inspector' | 'picker';

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: string; // matches UserRole
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
  row: number;
  total_buckets_today: number;
  hours: number;
  status: 'active' | 'break' | 'issue';
  safety_verified: boolean; // Was onboarded
  qcStatus: number[]; // 0 = bad, 1 = good, 2 = warning
  harnessId?: string;
  team_leader_id?: string;
  orchard_id?: string;
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
  target_roles: UserRole[];
  acknowledged_by: string[];
  created_at: string;
}