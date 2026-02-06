/**
 * Auth Context - Handles all authentication-related state and actions
 */
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { Role, UserRole, AppUser } from '../types';

// =============================================
// TYPES
// =============================================
interface AuthState {
    user: User | null;
    appUser: AppUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isSetupComplete: boolean;
    currentRole: Role | null;
    userName: string;
    userEmail: string;
    orchardId: string | null;
    teamId: string | null;
}

interface AuthContextType extends AuthState {
    signIn: (email: string, password: string) => Promise<{ user: User | null; profile: AppUser | null }>;
    signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
    signOut: () => Promise<void>;
    logout: () => Promise<void>;
    completeSetup: (role: Role, name: string, email: string) => void;
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
            // 1. Load user from users table - if doesn't exist, create
            let { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (userError || !userData) {
                // Get auth user data
                const { data: authData } = await supabase.auth.getUser();
                const authUser = authData?.user;

                // Create user profile
                const { data: newUser, error: createError } = await supabase
                    .from('users')
                    .insert({
                        id: userId,
                        email: authUser?.email || '',
                        full_name: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'User',
                        role: 'team_leader',
                        is_active: true,
                    })
                    .select()
                    .single();

                if (createError) {
                    userData = {
                        id: userId,
                        email: authUser?.email || '',
                        full_name: authUser?.email?.split('@')[0] || 'User',
                        role: 'team_leader',
                        orchard_id: null,
                    };
                } else {
                    userData = newUser;
                }
            }

            let orchardId = userData?.orchard_id;

            // Get first available orchard if none assigned
            if (!orchardId) {
                const { data: firstOrchard } = await supabase
                    .from('orchards')
                    .select('id')
                    .limit(1)
                    .single();
                if (firstOrchard) orchardId = firstOrchard.id;
            }

            // Determine role
            let roleEnum = Role.TEAM_LEADER;
            if (userData?.role === UserRole.MANAGER) roleEnum = Role.MANAGER;
            if (userData?.role === UserRole.RUNNER) roleEnum = Role.RUNNER;

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
            console.error('[AuthContext] Error loading user data:', error);
            updateAuthState({
                user: { id: userId } as User,
                isLoading: false,
                isAuthenticated: true,
                isSetupComplete: true,
                currentRole: Role.TEAM_LEADER,
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
                const { userData, orchardId } = await loadUserData(data.user.id);
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

    const signUp = async (email: string, password: string, fullName: string, role: UserRole) => {
        updateAuthState({ isLoading: true });
        try {
            const { data, error } = await supabase.auth.signUp({ email, password });
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
        await supabase.auth.signOut();
        setState({
            user: null,
            appUser: null,
            isAuthenticated: false,
            isLoading: false,
            isSetupComplete: false,
            currentRole: null,
            userName: '',
            userEmail: '',
            orchardId: null,
            teamId: null,
        });
    };

    const logout = signOut;

    // Demo mode setup (DISABLED FOR PRODUCTION)
    const completeSetup = (role: Role, name: string, email: string) => {
        console.warn("Demo mode is disabled. Please use real SignUp.");
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
    }, []);

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
