/* eslint-disable react-refresh/only-export-components */
/**
 * AuthContext - Global Authentication State Management
 * 
 * **Architecture**: React Context API
 * **Why Context?**: Authentication changes infrequently, needed globally, non-performance-critical
 * **See**: `docs/architecture/state-management.md` for decision rationale
 * 
 * @module context/AuthContext
 * @see {@link file:///c:/Users/ibrab/Downloads/app/harvestpro-nz%20%281%29/docs/architecture/state-management.md}
 */
import { logger } from '@/utils/logger';
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { db } from '../services/db';
import { syncService } from '../services/sync.service';
import { Role, AppUser } from '../types';

// =============================================
// TYPES
// =============================================
/**
 * Authentication state shape
 * Contains user session, profile, and role information
 */
interface AuthState {
    /** Supabase auth user (from auth.users table) */
    user: User | null;
    /** Application user profile (from public.users table) */
    appUser: AppUser | null;
    /** Whether user is currently authenticated */
    isAuthenticated: boolean;
    /** Loading state during auth initialization */
    isLoading: boolean;
    /** Whether initial setup wizard is complete */
    isSetupComplete: boolean;
    /** Current active role */
    currentRole: Role | null;
    /** Cached user display name */
    userName: string;
    /** Cached user email */
    userEmail: string;
    /** Currently selected orchard ID */
    orchardId: string | null;
    /** Team ID for team_leader role */
    teamId: string | null;
}

/**
 * AuthContext public API
 * Extends AuthState with authentication actions
 * 
 * @example
 * ```tsx
 * const { appUser, signIn, signOut } = useAuth();
 * await signIn('user@example.com', 'password');
 * ```
 */
interface AuthContextType extends AuthState {
    /** Sign in with email and password */
    signIn: (email: string, password: string) => Promise<{ user: User | null; profile: AppUser | null }>;
    /** Register new user account */
    signUp: (email: string, password: string, fullName: string, role: Role) => Promise<void>;
    /** Sign out current user (clears session) */
    signOut: () => Promise<void>;
    /** Alias for signOut */
    logout: () => Promise<void>;
    /** Complete initial setup wizard */
    completeSetup: (role: Role, name: string, email: string) => void;
    /** Manually update auth state (advanced use only) */
    updateAuthState: (updates: Partial<AuthState>) => void;
}

// =============================================
// CONTEXT
// =============================================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =============================================
// PROVIDER
// =============================================
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthState>({
        user: null,
        appUser: null,
        isAuthenticated: false,
        isLoading: true,
        isSetupComplete: false,
        currentRole: null,
        userName: '',
        userEmail: '',
        orchardId: null,
        teamId: null,
    });

    const updateAuthState = useCallback((updates: Partial<AuthState>) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    // =============================================
    // LOAD USER DATA
    // =============================================
    const loadUserData = async (userId: string) => {
        try {
            // 1. Load user from users table
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (userError || !userData) {

                logger.error('[AuthContext] User profile not found in DB:', userError);
                updateAuthState({ isLoading: false, isAuthenticated: false });
                throw new Error('User profile not found. Please contact support.');
            }

            let orchardId = userData?.orchard_id;

            // Get first available orchard if none assigned
            if (!orchardId) {
                const { data: firstOrchard } = await supabase
                    .from('orchards')
                    .select('id')
                    .limit(1)
                    .maybeSingle();

                if (firstOrchard) {
                    orchardId = firstOrchard.id;
                    // Persist to DB so RLS (SECURITY DEFINER) can see it!
                    await supabase
                        .from('users')
                        .update({ orchard_id: orchardId })
                        .eq('id', userId);
                }
            }

            // 🔍 ROLE DETERMINATION
            let roleEnum: Role | null = null;
            const dbRole = userData?.role?.toLowerCase();

            const roleMap: Record<string, Role> = {
                manager: Role.MANAGER,
                team_leader: Role.TEAM_LEADER,
                bucket_runner: Role.RUNNER,
                runner: Role.RUNNER,
                qc_inspector: Role.QC_INSPECTOR,
                payroll_admin: Role.PAYROLL_ADMIN,
                admin: Role.ADMIN,
                hr_admin: Role.HR_ADMIN,
                logistics: Role.LOGISTICS,
            };
            if (dbRole) roleEnum = roleMap[dbRole] ?? null;

            // If role is unknown/null, we DO NOT default to Team Leader.
            // We set it to null, which will be caught by Routing or Login.

            if (!roleEnum) {

                logger.warn(`[AuthContext] Unknown role "${dbRole}" for user ${userId}. Access Denied.`);
                updateAuthState({ isLoading: false, isAuthenticated: false });
                throw new Error('Access Denied: You do not have a valid role assigned. Contact Manager.');
            }

            updateAuthState({
                user: { id: userId } as User,
                appUser: userData as AppUser,
                currentRole: roleEnum,
                userName: userData?.full_name || '',
                userEmail: userData?.email || '',
                isAuthenticated: true,
                isSetupComplete: true,
                isLoading: false,
                orchardId,
                teamId: userData?.team_id || null,
            });

            return { userData, orchardId };
        } catch (error) {

            logger.error('[AuthContext] Critical Error loading user data:', error);
            // CRITICAL FIX: On error, ensure we are NOT authenticated
            updateAuthState({
                user: null,
                appUser: null,
                isLoading: false,
                isAuthenticated: false,
                currentRole: null,
            });
            return { userData: null, orchardId: null };
        }
    };

    // =============================================
    // AUTH ACTIONS
    // =============================================
    const signIn = async (email: string, password: string) => {
        updateAuthState({ isLoading: true });
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            if (data.user) {
                const { userData } = await loadUserData(data.user.id);
                return { user: data.user, profile: userData };
            } else {
                updateAuthState({ isLoading: false });
                return { user: null, profile: null };
            }
        } catch (error) {
            updateAuthState({ isLoading: false });
            throw error;
        }
    };

    const signUp = async (email: string, password: string, fullName: string, role: Role) => {
        updateAuthState({ isLoading: true });
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: role
                    }
                }
            });
            if (error) throw error;

            if (data.user) {
                await supabase.from('users').insert({
                    id: data.user.id,
                    email,
                    full_name: fullName,
                    role,
                    is_active: true,
                });
                await loadUserData(data.user.id);
            }
        } catch (error) {
            updateAuthState({ isLoading: false });
            throw error;
        }
    };

    const signOut = async () => {
        try {
            // 🔧 V27: Hard-gate — block logout if there are unsynced items
            const pendingCount = await syncService.getPendingCount();
            if (pendingCount > 0) {
                const confirmed = window.confirm(
                    `⚠️ ALERTA CRÍTICA: Tienes ${pendingCount} registros sin sincronizar.\n\n` +
                    `Si cierras sesión ahora, estos datos se perderán permanentemente ` +
                    `(incluyendo información de nómina).\n\n` +
                    `Conecta a internet y espera a que todo se sincronice antes de cerrar sesión.\n\n` +
                    `¿Estás SEGURO de que quieres cerrar sesión y PERDER estos datos?`
                );
                if (!confirmed) return; // Abort sign-out
                logger.warn(`[Auth] User forced sign-out with ${pendingCount} pending items — DATA WILL BE LOST`);
            }

            // 🔧 U6: Kill realtime channels BEFORE clearing auth
            supabase.removeAllChannels();
            await supabase.auth.signOut();
        } catch (error) {
            logger.error('Error signing out from Supabase:', error);
        } finally {
            // 🔧 U6: Wipe Dexie to prevent cross-session data leak on shared tablet
            try {
                await db.delete();
            } catch (e) {
                logger.error('[Auth] Dexie wipe failed:', e);
            }
            localStorage.clear();
            // 🔧 V26: Force hard reload to re-instantiate Dexie engine
            // Without this, the JS db instance is a zombie pointing to deleted IndexedDB
            window.location.reload();
        }
    };

    const logout = signOut;

    // Demo mode setup (DISABLED FOR PRODUCTION)
    const completeSetup = (_role: Role, _name: string, _email: string) => {

        logger.warn("Demo mode is disabled. Please use real SignUp.");
        // No-op or throw error
    };

    // =============================================
    // EFFECTS
    // =============================================
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                loadUserData(session.user.id);
            } else {
                setState(prev => ({ ...prev, isLoading: false }));
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user && !state.isAuthenticated) {
                loadUserData(session.user.id);
            } else if (!session && state.isAuthenticated) {
                signOut();
            }
        });

        return () => {
            subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Mount-only: auth subscription must not re-subscribe on state changes

    // =============================================
    // CONTEXT VALUE
    // =============================================
    const contextValue: AuthContextType = {
        ...state,
        signIn,
        signUp,
        signOut,
        logout,
        completeSetup,
        updateAuthState,
    };

    return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// =============================================
// HOOK
// =============================================
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export { supabase };
export default AuthContext;
