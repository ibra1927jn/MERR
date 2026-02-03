// =============================================
// HARVEST CONTEXT - VERSIÓN CORREGIDA CON MENSAJERÍA REAL
// =============================================
// 
// CAMBIOS PRINCIPALES:
// 1. sendMessage ahora inserta en Supabase (no solo estado local)
// 2. Suscripciones en tiempo real para mensajes
// 3. Sistema de grupos de chat funcional
// 4. Carga inicial de conversaciones desde DB
// 5. Validación de stickers duplicados
// =============================================

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '../services/supabase';
import { scanSticker, ScanResult, extractPickerIdFromSticker } from '../services/sticker.service';
import { generateUUID } from '../services/uuid.service';
import { syncService } from '../services/sync.service';
import { simpleMessaging, ChatMessage } from '../services/simple-messaging.service';
import { databaseService, RegisteredUser } from '../services/database.service';
// Types for backwards compatibility
type DBMessage = { id: string; sender_id: string; content: string; created_at: string; read_by?: string[] };
type ChatGroup = { id: string; name: string; members: string[]; isGroup?: boolean; lastMsg?: string; time?: string };
// Bridge to simpleMessaging - connects old API to new service
const messagingService = {
  subscribeToMessages: (_userId: string, _orchardId: string, _onMessage: (msg: DBMessage) => void) => {
    // Return unsubscribe function - new system uses per-conversation subscriptions
    return () => { };
  },
  unsubscribeFromMessages: () => { },
  loadUserGroups: async (userId: string): Promise<ChatGroup[]> => {
    const conversations = await simpleMessaging.getConversations(userId);
    return conversations.map(c => ({
      id: c.id,
      name: c.name || 'Chat',
      members: c.participant_ids,
      isGroup: c.type === 'group',
    }));
  },
  loadUserMessages: async (userId: string, _limit: number = 50): Promise<DBMessage[]> => {
    const conversations = await simpleMessaging.getConversations(userId);
    // Convert conversations to DBMessage format for backwards compatibility
    return conversations.map(c => ({
      id: c.id,
      sender_id: c.created_by || '',
      content: '',
      created_at: c.updated_at,
    }));
  },
  loadGroupMessages: async (groupId: string): Promise<DBMessage[]> => {
    const messages = await simpleMessaging.getMessages(groupId);
    return messages.map(m => ({
      id: m.id,
      sender_id: m.sender_id,
      content: m.content,
      created_at: m.created_at,
    }));
  },
  loadDirectConversation: async (userId1: string, userId2: string): Promise<DBMessage[]> => {
    const conv = await simpleMessaging.createConversation('direct', [userId1, userId2], userId1);
    if (!conv) return [];
    const messages = await simpleMessaging.getMessages(conv.id);
    return messages.map(m => ({
      id: m.id,
      sender_id: m.sender_id,
      content: m.content,
      created_at: m.created_at,
    }));
  },
  createGroup: async (creatorId: string, name: string, memberIds: string[]): Promise<ChatGroup | null> => {
    const conv = await simpleMessaging.createConversation('group', memberIds, creatorId, name);
    if (!conv) return null;
    return { id: conv.id, name: conv.name || name, members: conv.participant_ids, isGroup: true };
  },
  sendDirectMessage: async (senderId: string, recipientId: string, content: string, _orchardId?: string, _priority?: string): Promise<DBMessage | null> => {
    const conv = await simpleMessaging.createConversation('direct', [senderId, recipientId], senderId);
    if (!conv) return null;
    const msg = await simpleMessaging.sendMessage(conv.id, senderId, content);
    return msg ? { id: msg.id, sender_id: msg.sender_id, content: msg.content, created_at: msg.created_at } : null;
  },
  sendGroupMessage: async (senderId: string, groupId: string, content: string, _orchardId?: string, _priority?: string): Promise<DBMessage | null> => {
    const msg = await simpleMessaging.sendMessage(groupId, senderId, content);
    return msg ? { id: msg.id, sender_id: msg.sender_id, content: msg.content, created_at: msg.created_at } : null;
  },
  sendBroadcast: async (_senderId: string, _content: string, _orchardId?: string, _priority?: string): Promise<DBMessage | null> => {
    // Broadcasts use the broadcasts table, not chat - handled separately
    return null;
  },
  markAsRead: async (_messageId: string, _userId: string) => { },
  cleanup: () => { },
};
import {
  Role,
  UserRole,
  AppUser,
  Orchard,
  Block,
  Team,
  DaySetup,
  Picker,
  BucketRecord,
  BucketRunner,
  RowAssignment,
  BreakLog,
  Message,
  Broadcast,
  Alert,
  Bin,
  ChatThread,
  InventoryState,
  HarvestSettings,
  PickerStatus,
  CollectionStatus,
  RowStatus,
  MessagePriority,
  MINIMUM_WAGE,
  PIECE_RATE,
} from '../types';

// Re-exportar tipos necesarios
export { Role };
export type {
  UserRole, AppUser, Picker, RowAssignment, Broadcast, Alert,
  Message, DaySetup, PickerStatus, CollectionStatus, RowStatus, MessagePriority
};
export { supabase };

// =============================================
// ESTADO DEL CONTEXTO
// =============================================
interface HarvestState {
  // Auth
  isSetupComplete: boolean;
  currentRole: Role | null;
  userName: string;
  userEmail: string;
  user: User | null;
  appUser: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Datos de la operación
  orchard: Orchard | null;
  team: Team | null;
  daySetup: DaySetup | null;
  blocks: Block[];

  // Equipo y producción
  crew: Picker[];
  pickers: Picker[];
  bucketRecords: BucketRecord[];
  rowAssignments: RowAssignment[];
  breakLogs: BreakLog[];
  runners: BucketRunner[];
  pendingCollections: BucketRecord[];

  // Comunicación - ACTUALIZADO
  messages: DBMessage[];  // Ahora usa DBMessage del servicio
  broadcasts: Broadcast[];
  alerts: Alert[];
  unreadCount: number;
  chatGroups: ChatGroup[];  // NUEVO: grupos de chat

  // STAFF LISTS
  teamLeaders: RegisteredUser[];
  allRunners: RegisteredUser[];


  // Stats
  totalBucketsToday: number;
  teamVelocity: number;

  // Runner específico
  bins: Bin[];
  inventory: InventoryState;
  chats: ChatThread[];
  settings: HarvestSettings;

  // Estado de conexión
  isOnline: boolean;
  lastSyncAt: string | null;
}

// =============================================
// TIPO DEL CONTEXTO (FUNCIONES)
// =============================================
interface HarvestContextType extends HarvestState {
  // Auth
  completeSetup: (role: Role, name: string, email: string) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;

  // Pickers
  addTeamMember: (name: string, employeeId: string) => void;
  updatePickerDetails: (id: string, updates: Partial<Picker>) => void;
  addPicker: (picker: Omit<Picker, 'id'>) => Promise<Picker>;
  updatePicker: (id: string, updates: Partial<Picker>) => Promise<void>;
  removePicker: (id: string) => Promise<void>;

  // Buckets
  scanBucket: (pickerId: string, rowNumber?: number, qualityGrade?: string) => Promise<BucketRecord>;
  collectBuckets: (bucketIds: string[], runnerId: string) => Promise<void>;
  deliverBuckets: (bucketIds: string[]) => Promise<void>;

  // Breaks
  logBreak: (pickerId: string, breakType: BreakLog['break_type']) => Promise<void>;
  endBreak: (breakLogId: string) => Promise<void>;

  // Rows
  assignRow: (rowNumber: number, side: 'north' | 'south' | 'both', pickerIds: string[]) => Promise<void>;
  updateRowProgress: (rowAssignmentId: string, percentage: number) => Promise<void>;
  completeRow: (rowAssignmentId: string) => Promise<void>;

  // Messaging - ACTUALIZADO
  sendMessage: (channelType: Message['channel_type'], recipientId: string, content: string, priority?: MessagePriority) => Promise<DBMessage | null>;
  sendBroadcast: (title: string, content: string, priority?: MessagePriority, targetRoles?: UserRole[]) => Promise<void>;
  markMessageRead: (messageId: string) => Promise<void>;
  acknowledgeBroadcast: (broadcastId: string) => Promise<void>;

  // Chat Groups - NUEVO
  createChatGroup: (name: string, memberIds: string[]) => Promise<ChatGroup | null>;
  loadChatGroups: () => Promise<void>;
  loadConversation: (recipientId: string, isGroup: boolean) => Promise<DBMessage[]>;

  // Alerts
  createAlert: (alert: Omit<Alert, 'id' | 'created_at' | 'is_resolved'>) => Promise<void>;
  resolveAlert: (alertId: string) => Promise<void>;

  // Day
  startDay: (blockId: string, variety: string, targetSize: string, targetColor: string) => Promise<void>;
  endDay: (signature?: string) => Promise<void>;

  // Runner específicos
  addBucket: (binId: string) => void;
  addBucketWithValidation: (binId: string, stickerCode: string) => Promise<ScanResult>;
  updateInventory: (key: keyof InventoryState, delta: number) => void;

  // Utility
  refreshData: () => Promise<void>;
  setCurrentView: (view: string) => void;
  currentView: string;
  updateSettings: (newSettings: Partial<HarvestSettings>) => void;
}

// =============================================
// VALORES INICIALES
// =============================================
const defaultCrew: Picker[] = [];

const defaultSettings: HarvestSettings = {
  bucketRate: PIECE_RATE,
  targetTons: 40,
  startTime: '07:00',
  teams: ['Alpha', 'Beta'],
};

const defaultInventory: InventoryState = {
  emptyBins: 25,
  binsOfBuckets: 0,
};

// =============================================
// CONTEXTO
// =============================================
const HarvestContext = createContext<HarvestContextType | undefined>(undefined);

// =============================================
// PROVIDER
// =============================================
export const HarvestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<HarvestState>({
    isSetupComplete: false,
    currentRole: null,
    userName: '',
    userEmail: '',
    user: null,
    appUser: null,
    isAuthenticated: false,
    isLoading: true,
    orchard: null,
    team: null,
    daySetup: null,
    blocks: [],
    crew: defaultCrew,
    pickers: defaultCrew,
    bucketRecords: [],
    rowAssignments: [],
    breakLogs: [],
    runners: [],
    pendingCollections: [],
    messages: [],
    broadcasts: [],
    alerts: [],
    unreadCount: 0,
    chatGroups: [],  // NUEVO
    teamLeaders: [], // NUEVO
    allRunners: [], // NUEVO
    totalBucketsToday: 0,
    teamVelocity: 0,
    bins: [{ id: 'BIN-001', status: 'empty', fillPercentage: 0, type: 'Standard', timestamp: new Date().toISOString() }],
    inventory: defaultInventory,
    chats: [],
    settings: defaultSettings,
    isOnline: navigator.onLine,
    lastSyncAt: null,
  });


  const [currentView, setCurrentView] = useState('home');
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const updateState = useCallback((updates: Partial<HarvestState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const updateSettings = useCallback((newSettings: Partial<HarvestSettings>) => {
    setState(prev => ({ ...prev, settings: { ...prev.settings, ...newSettings } }));
  }, []);

  // =============================================
  // CARGA DE DATOS DESDE SUPABASE
  // =============================================
  const loadUserData = async (userId: string) => {
    try {
      // 1. Cargar usuario - si no existe, crearlo
      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      // Si el usuario no existe en la tabla users, crearlo
      if (userError || !userData) {
        console.log('[HarvestContext] User not found in users table, creating profile...');

        // Obtener datos del usuario de auth
        const { data: authData } = await supabase.auth.getUser();
        const authUser = authData?.user;

        // Crear perfil de usuario
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: authUser?.email || '',
            full_name: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'User',
            role: 'team_leader', // Rol por defecto
            is_active: true,
          })
          .select()
          .single();

        if (createError) {
          console.error('[HarvestContext] Error creating user profile:', createError);
          // Continuar con un usuario básico si falla la creación
          userData = {
            id: userId,
            email: authUser?.email || '',
            full_name: authUser?.email?.split('@')[0] || 'User',
            role: 'team_leader',
            orchard_id: null,
          };
        } else {
          userData = newUser;
          console.log('[HarvestContext] User profile created successfully');
        }
      }

      let orchardId = userData?.orchard_id;

      // Si no tiene huerto asignado, buscar el primero disponible
      if (!orchardId) {
        const { data: firstOrchard } = await supabase
          .from('orchards')
          .select('id')
          .limit(1)
          .single();

        if (firstOrchard) orchardId = firstOrchard.id;
      }

      // Determinar rol
      let roleEnum = Role.TEAM_LEADER;
      if (userData?.role === 'manager') roleEnum = Role.MANAGER;
      if (userData?.role === 'bucket_runner') roleEnum = Role.RUNNER;

      // 2. Cargar datos del huerto
      let orchard = null;
      let blocks: Block[] = [];

      if (orchardId) {
        const { data: orchardData } = await supabase
          .from('orchards')
          .select('*')
          .eq('id', orchardId)
          .single();
        orchard = orchardData;

        const { data: blocksData } = await supabase
          .from('blocks')
          .select('*')
          .eq('orchard_id', orchardId);
        blocks = blocksData || [];
      }


      // 3. Cargar pickers (Uso de databaseService para mapeo consistente)
      const isTeamLeader = userData?.role === 'team_leader';
      const mappedCrew = await databaseService.getAllPickers(orchardId, isTeamLeader ? userId : undefined);

      // 4. Cargar row assignments
      const { data: rowsData } = await supabase
        .from('row_assignments')
        .select('*')
        .in('status', ['assigned', 'in_progress']);

      const mappedRows: RowAssignment[] = (rowsData || []).map((r: any) => ({
        id: r.id,
        day_setup_id: r.day_setup_id,
        block_id: r.block_id,
        team_id: r.team_id,
        row_number: r.row_number,
        side: r.side,
        status: r.status as RowStatus,
        assigned_pickers: r.assigned_pickers || [],
        completion_percentage: r.completion_percentage || 0,
        started_at: r.started_at,
        completed_at: r.completed_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));

      // 5. Cargar broadcasts
      const { data: broadcastsData } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('orchard_id', orchardId)
        .order('created_at', { ascending: false })
        .limit(20);

      // 6. Cargar alerts
      const { data: alertsData } = await supabase
        .from('alerts')
        .select('*')
        .eq('orchard_id', orchardId)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

      // 7. Cargar day setup de hoy (sin join para evitar errores)
      const today = new Date().toISOString().split('T')[0];
      let daySetupData = null;
      try {
        const { data } = await supabase
          .from('day_setups')
          .select('*')
          .eq('orchard_id', orchardId)
          .eq('setup_date', today)
          .maybeSingle();
        daySetupData = data;
      } catch (e) {
        console.log('[HarvestContext] day_setups query skipped');
      }

      // 8. NUEVO: Cargar mensajes del usuario
      const userMessages = await messagingService.loadUserMessages(userId, 100);

      // 9. NUEVO: Cargar grupos de chat
      const userGroups = await messagingService.loadUserGroups(userId);

      // 10. Load Team Leaders and Runners
      const teamLeaders = await databaseService.getTeamLeaders(orchardId);
      const allRunners = await databaseService.getBucketRunners(orchardId);

      // 11. NUEVO: Suscribirse a mensajes en tiempo real
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      unsubscribeRef.current = messagingService.subscribeToMessages(
        userId,
        orchardId,
        (newMessage) => {
          console.log('[HarvestContext] New message received via realtime:', newMessage.id);
          setState(prev => ({
            ...prev,
            messages: [newMessage, ...prev.messages.filter(m => m.id !== newMessage.id)],
            unreadCount: prev.unreadCount + 1,
          }));
        }
      );

      // Calcular stats
      const totalBuckets = mappedCrew.reduce((sum, p) => sum + p.buckets, 0);

      updateState({
        user: { id: userId } as User,
        appUser: userData as AppUser,
        currentRole: roleEnum,
        userName: userData?.full_name || '',
        userEmail: userData?.email || '',
        isAuthenticated: true,
        isSetupComplete: true,
        isLoading: false,
        orchard,
        blocks,
        crew: mappedCrew,
        pickers: mappedCrew,
        rowAssignments: mappedRows,
        broadcasts: broadcastsData || [],
        alerts: alertsData || [],
        daySetup: daySetupData,
        messages: userMessages,  // NUEVO
        chatGroups: userGroups,   // NUEVO
        teamLeaders, // NUEVO
        allRunners, // NUEVO
        totalBucketsToday: totalBuckets,
        teamVelocity: mappedCrew.length > 0 ? Math.round(totalBuckets / Math.max(1, mappedCrew.length)) : 0,
        lastSyncAt: new Date().toISOString(),
      });

    } catch (error) {
      console.error('[HarvestContext] Error loading user data:', error);
      // IMPORTANTE: Aunque falle la carga de datos adicionales,
      // mantener al usuario autenticado para que no vuelva al login
      updateState({
        user: { id: userId } as User, // Ensure user object is present
        isLoading: false,
        isAuthenticated: true,
        isSetupComplete: true, // FORCE COMPLETE to avoid loop
        currentRole: Role.TEAM_LEADER, // Fallback role
      });
    }
  };

  // =============================================
  // AUTENTICACIÓN
  // =============================================
  const signIn = async (email: string, password: string) => {
    console.log('[HarvestContext] signIn called with email:', email);
    updateState({ isLoading: true });
    try {
      console.log('[HarvestContext] Calling supabase.auth.signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error('[HarvestContext] Auth error:', error.message);
        throw error;
      }

      console.log('[HarvestContext] Auth successful, user:', data.user?.id);

      if (data.user) {
        console.log('[HarvestContext] Calling loadUserData...');
        await loadUserData(data.user.id);
        console.log('[HarvestContext] loadUserData completed successfully');
      } else {
        console.error('[HarvestContext] No user returned from auth');
        updateState({ isLoading: false });
      }
    } catch (error: any) {
      console.error('[HarvestContext] signIn error:', error);
      updateState({ isLoading: false });
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: UserRole) => {
    updateState({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email,
            full_name: fullName,
            role,
            is_active: true,
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
        }

        await loadUserData(data.user.id);
      }
    } catch (error) {
      updateState({ isLoading: false });
      throw error;
    }
  };

  const signOut = async () => {
    // Limpiar suscripción de mensajes
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Limpiar servicio de mensajería
    messagingService.cleanup();

    await supabase.auth.signOut();

    // Reset state
    setState({
      isSetupComplete: false,
      currentRole: null,
      userName: '',
      userEmail: '',
      user: null,
      appUser: null,
      isAuthenticated: false,
      isLoading: false,
      orchard: null,
      team: null,
      daySetup: null,
      blocks: [],
      crew: [],
      pickers: [],
      bucketRecords: [],
      rowAssignments: [],
      breakLogs: [],
      runners: [],
      pendingCollections: [],
      messages: [],
      broadcasts: [],
      alerts: [],
      unreadCount: 0,
      chatGroups: [],
      teamLeaders: [],
      allRunners: [],
      totalBucketsToday: 0,
      teamVelocity: 0,
      bins: [{ id: 'BIN-001', status: 'empty', fillPercentage: 0, type: 'Standard', timestamp: new Date().toISOString() }],
      inventory: defaultInventory,
      chats: [],
      settings: defaultSettings,
      isOnline: navigator.onLine,
      lastSyncAt: null,
    });
  };

  const logout = signOut;

  // Setup para demo (sin DB)
  const completeSetup = (role: Role, name: string, email: string) => {
    const userRoleMap: Record<Role, UserRole> = {
      [Role.MANAGER]: 'manager',
      [Role.TEAM_LEADER]: 'team_leader',
      [Role.RUNNER]: 'bucket_runner',
    };

    const appUser: AppUser = {
      id: generateUUID(),
      email: email,
      full_name: name,
      role: userRoleMap[role],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    updateState({
      isSetupComplete: true,
      currentRole: role,
      userName: name,
      userEmail: email,
      appUser: appUser,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  // =============================================
  // PICKER ACTIONS
  // =============================================
  const addTeamMember = (name: string, employeeId: string) => {
    addPicker({
      name,
      employeeId,
      role: 'Picker',
      avatar: name.substring(0, 2).toUpperCase(),
      onboarded: false,
      buckets: 0,
      status: 'active',
      qcStatus: [],
    });
  };

  const updatePickerDetails = (id: string, updates: Partial<Picker>) => {
    updatePicker(id, updates);
  };

  const addPicker = async (pickerData: Omit<Picker, 'id'>): Promise<Picker> => {
    try {
      // Allow creating pickers without orchard (manager will assign later)
      // if (!state.orchard?.id) { ... }

      const { data, error } = await supabase
        .from('pickers')
        .insert([{
          full_name: pickerData.name,
          picker_id: pickerData.employeeId,
          harness_number: pickerData.harnessId,
          status: 'active',
          safety_verified: pickerData.onboarded,
          daily_buckets: 0,
          orchard_id: state.orchard?.id || null,
          team_leader_id: state.appUser?.id, // Link to creator
        }])
        .select()
        .single();

      if (error) {
        console.error('[HarvestContext] Supabase error adding picker:', error);
        throw error;
      }

      const newPicker: Picker = {
        id: data.id,
        name: data.full_name,
        avatar: pickerData.avatar || data.full_name?.substring(0, 2).toUpperCase() || '??',
        role: 'Picker',
        employeeId: data.picker_id || '',
        harnessId: data.harness_number,
        onboarded: data.safety_verified || false,
        buckets: 0,
        status: 'active',
        qcStatus: [],
      };

      setState(prev => ({
        ...prev,
        crew: [...prev.crew, newPicker],
        pickers: [...prev.pickers, newPicker],
      }));

      return newPicker;
    } catch (e: any) {
      console.error('Error adding picker (falling back to offline mode):', e.message || e);
      if (e.code) console.error('DB Error Code:', e.code);
      if (e.details) console.error('DB Error Details:', e.details);

      const newPicker: Picker = {
        id: generateUUID(),
        ...pickerData,
      };
      setState(prev => ({
        ...prev,
        crew: [...prev.crew, newPicker],
        pickers: [...prev.pickers, newPicker],
      }));
      // Queue for sync when back online
      syncService.queueOperation('pickers', 'INSERT', {
        id: newPicker.id,
        full_name: newPicker.name,
        picker_id: newPicker.employeeId,
        status: 'active',
        team_leader_id: state.appUser?.id, // Also ensure this is synced!
        orchard_id: state.orchard?.id || null,
      });
      return newPicker;
    }
  };

  const updatePicker = async (id: string, updates: Partial<Picker>) => {
    setState(prev => ({
      ...prev,
      crew: prev.crew.map(p => p.id === id ? { ...p, ...updates } : p),
      pickers: prev.pickers.map(p => p.id === id ? { ...p, ...updates } : p),
    }));

    const dbUpdates: any = {};
    if (updates.harnessId !== undefined) dbUpdates.harness_number = updates.harnessId;
    if (updates.row !== undefined) dbUpdates.current_row = updates.row;
    if (updates.buckets !== undefined) dbUpdates.daily_buckets = updates.buckets;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.onboarded !== undefined) dbUpdates.safety_verified = updates.onboarded;

    if (Object.keys(dbUpdates).length > 0) {
      await supabase.from('pickers').update(dbUpdates).eq('id', id);
    }
  };

  const removePicker = async (id: string) => {
    try {
      await supabase.from('pickers').delete().eq('id', id);
    } catch (e) {
      console.error('Error removing picker from DB:', e);
      // Queue for sync when back online
      syncService.queueOperation('pickers', 'DELETE', { id });
    }

    setState(prev => ({
      ...prev,
      crew: prev.crew.filter(p => p.id !== id),
      pickers: prev.pickers.filter(p => p.id !== id),
    }));
  };

  // =============================================
  // ROW ACTIONS
  // =============================================
  const assignRow = async (rowNumber: number, side: 'north' | 'south' | 'both', pickerIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('row_assignments')
        .insert([{
          row_number: rowNumber,
          side: side,
          assigned_pickers: pickerIds,
          status: 'assigned',
          completion_percentage: 0,
          day_setup_id: state.daySetup?.id,
        }])
        .select()
        .single();

      if (error) console.error('DB Error:', error);

      const newRow: RowAssignment = {
        id: data?.id || generateUUID(),
        day_setup_id: state.daySetup?.id,
        row_number: rowNumber,
        side,
        status: 'assigned',
        assigned_pickers: pickerIds,
        completion_percentage: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setState(prev => ({
        ...prev,
        rowAssignments: [...prev.rowAssignments, newRow],
      }));
    } catch (e) {
      console.error('Error assigning row:', e);
      // Queue for sync when back online
      const rowId = generateUUID();
      const newRow: RowAssignment = {
        id: rowId,
        day_setup_id: state.daySetup?.id,
        row_number: rowNumber,
        side,
        status: 'assigned',
        assigned_pickers: pickerIds,
        completion_percentage: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setState(prev => ({
        ...prev,
        rowAssignments: [...prev.rowAssignments, newRow],
      }));
      syncService.queueOperation('row_assignments', 'INSERT', {
        id: rowId,
        row_number: rowNumber,
        side,
        assigned_pickers: pickerIds,
        status: 'assigned',
        completion_percentage: 0,
      });
    }
  };

  const updateRowProgress = async (rowAssignmentId: string, percentage: number) => {
    setState(prev => ({
      ...prev,
      rowAssignments: prev.rowAssignments.map(ra =>
        ra.id === rowAssignmentId
          ? { ...ra, completion_percentage: percentage, status: percentage > 0 ? 'in_progress' as RowStatus : 'assigned' as RowStatus }
          : ra
      ),
    }));

    await supabase
      .from('row_assignments')
      .update({ completion_percentage: percentage, status: percentage > 0 ? 'in_progress' : 'assigned' })
      .eq('id', rowAssignmentId);
  };

  const completeRow = async (rowAssignmentId: string) => {
    setState(prev => ({
      ...prev,
      rowAssignments: prev.rowAssignments.map(ra =>
        ra.id === rowAssignmentId
          ? { ...ra, completion_percentage: 100, status: 'completed' as RowStatus, completed_at: new Date().toISOString() }
          : ra
      ),
    }));

    await supabase
      .from('row_assignments')
      .update({ completion_percentage: 100, status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', rowAssignmentId);
  };

  // =============================================
  // BUCKET ACTIONS
  // =============================================
  const scanBucket = async (pickerId: string, rowNumber?: number, qualityGrade?: string): Promise<BucketRecord> => {
    const record: BucketRecord = {
      id: generateUUID(),
      day_setup_id: state.daySetup?.id || '1',
      picker_id: pickerId,
      team_id: state.team?.id,
      row_number: rowNumber,
      bucket_count: 1,
      quality_grade: (qualityGrade as 'A' | 'B' | 'C' | 'reject') || 'A',
      collection_status: 'pending',
      scanned_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    setState(prev => ({
      ...prev,
      bucketRecords: [record, ...prev.bucketRecords],
      totalBucketsToday: prev.totalBucketsToday + 1,
      crew: prev.crew.map(p => p.id === pickerId ? { ...p, buckets: p.buckets + 1 } : p),
      pickers: prev.pickers.map(p => p.id === pickerId ? { ...p, buckets: p.buckets + 1 } : p),
    }));

    return record;
  };

  const collectBuckets = async (bucketIds: string[], runnerId: string) => {
    setState(prev => ({
      ...prev,
      bucketRecords: prev.bucketRecords.map(br =>
        bucketIds.includes(br.id)
          ? { ...br, collection_status: 'collected' as CollectionStatus, collected_by: runnerId, collected_at: new Date().toISOString() }
          : br
      ),
    }));
  };

  const deliverBuckets = async (bucketIds: string[]) => {
    setState(prev => ({
      ...prev,
      bucketRecords: prev.bucketRecords.map(br =>
        bucketIds.includes(br.id)
          ? { ...br, collection_status: 'delivered' as CollectionStatus, delivered_at: new Date().toISOString() }
          : br
      ),
    }));
  };

  // =============================================
  // BREAK ACTIONS
  // =============================================
  const logBreak = async (pickerId: string, breakType: BreakLog['break_type']) => {
    const breakLog: BreakLog = {
      id: generateUUID(),
      day_setup_id: state.daySetup?.id || '1',
      picker_id: pickerId,
      break_type: breakType,
      started_at: new Date().toISOString(),
      is_overdue: false,
      created_at: new Date().toISOString(),
    };

    setState(prev => ({
      ...prev,
      breakLogs: [breakLog, ...prev.breakLogs],
      crew: prev.crew.map(p => p.id === pickerId ? { ...p, status: 'on_break' as PickerStatus } : p),
      pickers: prev.pickers.map(p => p.id === pickerId ? { ...p, status: 'on_break' as PickerStatus } : p),
      alerts: prev.alerts.filter(a => !(a.related_picker_id === pickerId && a.alert_type === 'hydration')),
    }));
  };

  const endBreak = async (breakLogId: string) => {
    const breakLog = state.breakLogs.find(b => b.id === breakLogId);
    if (!breakLog) return;

    const startedAt = new Date(breakLog.started_at);
    const now = new Date();
    const durationMinutes = Math.round((now.getTime() - startedAt.getTime()) / 60000);

    setState(prev => ({
      ...prev,
      breakLogs: prev.breakLogs.map(b =>
        b.id === breakLogId
          ? { ...b, ended_at: now.toISOString(), duration_minutes: durationMinutes }
          : b
      ),
      crew: prev.crew.map(p => p.id === breakLog.picker_id ? { ...p, status: 'active' as PickerStatus } : p),
      pickers: prev.pickers.map(p => p.id === breakLog.picker_id ? { ...p, status: 'active' as PickerStatus } : p),
    }));
  };

  // =============================================
  // MESSAGING ACTIONS - ACTUALIZADO CON SUPABASE
  // =============================================

  const sendMessage = async (
    channelType: Message['channel_type'],
    recipientId: string,
    content: string,
    priority: MessagePriority = 'normal'
  ): Promise<DBMessage | null> => {
    if (!state.appUser) {
      console.error('[HarvestContext] No user logged in');
      return null;
    }

    try {
      let message: DBMessage | null = null;

      if (channelType === 'direct') {
        message = await messagingService.sendDirectMessage(
          state.appUser.id,
          recipientId,
          content,
          state.orchard?.id,
          priority
        );
      } else if (channelType === 'team') {
        message = await messagingService.sendGroupMessage(
          state.appUser.id,
          recipientId,
          content,
          state.orchard?.id,
          priority
        );
      } else if (channelType === 'broadcast') {
        message = await messagingService.sendBroadcast(
          state.appUser.id,
          content,
          state.orchard?.id || '',
          priority
        );
      }

      if (message) {
        setState(prev => ({
          ...prev,
          messages: [message!, ...prev.messages],
        }));
      }

      return message;
    } catch (error) {
      console.error('[HarvestContext] Error sending message:', error);
      throw error;
    }
  };

  const sendBroadcast = async (
    title: string,
    content: string,
    priority: MessagePriority = 'normal',
    targetRoles?: UserRole[]
  ) => {
    if (!state.appUser || !state.orchard) return;

    try {
      const broadcast: Broadcast = {
        id: generateUUID(),
        orchard_id: state.orchard.id,
        sender_id: state.appUser.id,
        title,
        content,
        priority,
        target_roles: targetRoles || ['team_leader', 'picker', 'bucket_runner'],
        acknowledged_by: [],
        created_at: new Date().toISOString(),
      };

      await supabase.from('broadcasts').insert([broadcast]);

      await messagingService.sendBroadcast(
        state.appUser.id,
        `${title}: ${content}`,
        state.orchard.id,
        priority
      );

      setState(prev => ({
        ...prev,
        broadcasts: [broadcast, ...prev.broadcasts]
      }));
    } catch (error) {
      console.error('[HarvestContext] Error sending broadcast:', error);
    }
  };

  const markMessageRead = async (messageId: string) => {
    if (!state.appUser) return;

    await messagingService.markAsRead(messageId, state.appUser.id);

    setState(prev => ({
      ...prev,
      messages: prev.messages.map(m =>
        m.id === messageId && !m.read_by.includes(state.appUser!.id)
          ? { ...m, read_by: [...m.read_by, state.appUser!.id] }
          : m
      ),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    }));
  };

  const acknowledgeBroadcast = async (broadcastId: string) => {
    if (!state.appUser) return;
    setState(prev => ({
      ...prev,
      broadcasts: prev.broadcasts.map(b =>
        b.id === broadcastId && !b.acknowledged_by.includes(state.appUser!.id)
          ? { ...b, acknowledged_by: [...b.acknowledged_by, state.appUser!.id] }
          : b
      ),
    }));
  };

  // =============================================
  // CHAT GROUPS - NUEVO
  // =============================================

  const createChatGroup = async (name: string, memberIds: string[]): Promise<ChatGroup | null> => {
    if (!state.appUser) return null;

    try {
      const group = await messagingService.createGroup(
        state.appUser.id,
        name,
        memberIds
      );

      if (group) {
        setState(prev => ({
          ...prev,
          chatGroups: [group, ...prev.chatGroups],
        }));
      }

      return group;
    } catch (error) {
      console.error('[HarvestContext] Error creating group:', error);
      throw error;
    }
  };

  const loadChatGroups = async () => {
    if (!state.appUser) return;

    try {
      const groups = await messagingService.loadUserGroups(state.appUser.id);
      setState(prev => ({ ...prev, chatGroups: groups }));
    } catch (error) {
      console.error('[HarvestContext] Error loading groups:', error);
    }
  };

  const loadConversation = async (recipientId: string, isGroup: boolean): Promise<DBMessage[]> => {
    if (!state.appUser) return [];

    try {
      if (isGroup) {
        return await messagingService.loadGroupMessages(recipientId);
      } else {
        return await messagingService.loadDirectConversation(state.appUser.id, recipientId);
      }
    } catch (error) {
      console.error('[HarvestContext] Error loading conversation:', error);
      return [];
    }
  };

  // =============================================
  // ALERT ACTIONS
  // =============================================
  const createAlert = async (alert: Omit<Alert, 'id' | 'created_at' | 'is_resolved'>) => {
    const newAlert: Alert = {
      ...alert,
      id: generateUUID(),
      is_resolved: false,
      created_at: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, alerts: [newAlert, ...prev.alerts] }));
  };

  const resolveAlert = async (alertId: string) => {
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.filter(a => a.id !== alertId),
    }));
  };

  // =============================================
  // DAY ACTIONS
  // =============================================
  const startDay = async (blockId: string, variety: string, targetSize: string, targetColor: string) => {
    const daySetup: DaySetup = {
      id: generateUUID(),
      orchard_id: state.orchard?.id || '1',
      setup_date: new Date().toISOString().split('T')[0],
      block_id: blockId,
      variety,
      target_size: targetSize,
      target_color: targetColor,
      bin_type: 'standard',
      min_wage_rate: MINIMUM_WAGE,
      piece_rate: PIECE_RATE,
      min_buckets_per_hour: MINIMUM_WAGE / PIECE_RATE,
      status: 'active',
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    updateState({ daySetup });
  };

  const endDay = async (signature?: string) => {
    if (!state.daySetup) return;
    updateState({
      daySetup: { ...state.daySetup, status: 'completed', ended_at: new Date().toISOString() },
    });
  };

  // =============================================
  // RUNNER SPECIFIC ACTIONS
  // =============================================
  const addBucket = (binId: string) => {
    setState(prev => ({
      ...prev,
      bins: prev.bins.map(b => {
        if (b.id === binId) {
          const newFill = Math.min(100, b.fillPercentage + (100 / 72));
          return { ...b, fillPercentage: newFill, status: newFill >= 100 ? 'full' : 'in-progress' };
        }
        return b;
      }),
      inventory: {
        ...prev.inventory,
        binsOfBuckets: prev.bins.some(b => b.id === binId && b.fillPercentage >= 100)
          ? prev.inventory.binsOfBuckets + 1
          : prev.inventory.binsOfBuckets,
      },
      totalBucketsToday: prev.totalBucketsToday + 1,
    }));
  };

  // Función con validación de duplicados - guarda en base de datos
  const addBucketWithValidation = async (binId: string, stickerCode: string): Promise<ScanResult> => {
    // Obtener el team leader actual (puede ser el usuario actual o uno asignado)
    const teamLeaderId = state.appUser?.role === 'team_leader' ? state.appUser.id : undefined;

    const result = await scanSticker(
      stickerCode,
      binId,
      state.appUser?.id,
      teamLeaderId,
      state.orchard?.id
    );

    // Permitir si es exitoso O si estamos en modo offline (error 'OFFLINE_MODE')
    if (result.success || result.error === 'OFFLINE_MODE') {
      // 1. Agregar bucket localmente para feedback inmediato
      addBucket(binId);

      // 2. Resolver ID del picker
      let pickerId = result.pickerId;

      // Si fue offline, extraemos el ID manualmente del código
      if (!pickerId && result.error === 'OFFLINE_MODE') {
        pickerId = extractPickerIdFromSticker(stickerCode) || undefined;

        // Encolar sincronización para cuando vuelva la conexión
        if (pickerId) {
          const offlineScan = {
            sticker_code: stickerCode,
            picker_id: pickerId,
            bin_id: binId,
            scanned_by: state.appUser?.id,
            team_leader_id: teamLeaderId,
            orchard_id: state.orchard?.id,
            scanned_at: new Date().toISOString()
          };

          // Usar 'scanned_stickers' como la tabla
          syncService.queueOperation('scanned_stickers', 'INSERT', offlineScan);
          console.log('[HarvestContext] Scan queued for offline sync');
        }
      }

      // 3. Sincronizar el contador del picker si se encontró un pickerId
      if (pickerId) {
        // Buscar picker por employeeId (primeros 5 dígitos del sticker)
        const picker = state.pickers.find(p => p.employeeId === pickerId);
        if (picker) {
          // Actualizar el picker en estado local y DB
          updatePicker(picker.id, { buckets: picker.buckets + 1 });
          console.log(`[HarvestContext] Bucket added to picker ${picker.name}, new total: ${picker.buckets + 1}`);
        } else {
          console.log(`[HarvestContext] No picker found with employeeId: ${pickerId}`);
        }
      }

      // Si fue offline, devolvemos éxito para que la UI no muestre error
      if (result.error === 'OFFLINE_MODE') {
        return { success: true, pickerId };
      }
    }

    return result;
  };

  const updateInventory = (key: keyof InventoryState, delta: number) => {
    setState(prev => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        [key]: Math.max(0, prev.inventory[key] + delta),
      },
    }));
  };

  // =============================================
  // REFRESH DATA
  // =============================================
  const refreshData = async () => {
    if (state.user) {
      await loadUserData(state.user.id);
    }
  };

  // =============================================
  // EFFECTS
  // =============================================

  // Check session on mount
  useEffect(() => {
    console.log('HARVESTPRO VERSION: 2.5 (Fixed Columns & Persistence)');
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && !state.isAuthenticated) {
        loadUserData(session.user.id);
      } else if (!session && state.isAuthenticated) {
        signOut();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      messagingService.cleanup();
    };
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      updateState({ isOnline: true });
      refreshData();
    };
    const handleOffline = () => {
      updateState({ isOnline: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // =============================================
  // CONTEXT VALUE
  // =============================================
  const contextValue: HarvestContextType = {
    ...state,
    currentView,
    setCurrentView,
    completeSetup,
    signIn,
    signUp,
    signOut,
    logout,
    addTeamMember,
    updatePickerDetails,
    addPicker,
    updatePicker,
    removePicker,
    scanBucket,
    collectBuckets,
    deliverBuckets,
    logBreak,
    endBreak,
    assignRow,
    updateRowProgress,
    completeRow,
    sendMessage,
    sendBroadcast,
    markMessageRead,
    acknowledgeBroadcast,
    createChatGroup,
    loadChatGroups,
    loadConversation,
    createAlert,
    resolveAlert,
    startDay,
    endDay,
    addBucket,
    addBucketWithValidation,
    updateInventory,
    refreshData,
    updateSettings,
  };

  return (
    <HarvestContext.Provider value={contextValue}>
      {children}
    </HarvestContext.Provider>
  );
};

// =============================================
// HOOK
// =============================================
export const useHarvest = (): HarvestContextType => {
  const context = useContext(HarvestContext);
  if (!context) {
    throw new Error('useHarvest must be used within a HarvestProvider');
  }
  return context;
};

export default HarvestContext;