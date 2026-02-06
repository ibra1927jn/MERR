/**
 * Auth Context - Handles all authentication-related state and actions
 */
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { Role, AppUser } from '../types';

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
    signUp: (email: string, password: string, fullName: string, role: Role) => Promise<void>;
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
            // 1. Load user from users table
            let { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (userError || !userData) {
                console.error('[AuthContext] User profile not found in DB:', userError);
                // CRITICAL SECURITY FIX: Do NOT auto-create "Team Leader" just because profile is missing.
                // Do NOT set isAuthenticated = true.

                // If we want to auto-create logic, it should be explicit. 
                // For now, if profile doesn't exist, we fail the detailed load.
                // But legacy logic tried to create one. Let's keep creation BUT failing that, we throw.

                // Get auth user data to try creation
                const { data: authData } = await supabase.auth.getUser();
                const authUser = authData?.user;

                if (authUser) {
                    // Attempt creation
                    const { data: newUser, error: createError } = await supabase
                        .from('users')
                        .insert({
                            id: userId,
                            email: authUser.email || '',
                            full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
                            role: 'team_leader', // Default only on CREATION
                            is_active: true,
                        })
                        .select()
                        .single();

                    if (createError || !newUser) {
                        console.error('[AuthContext] Failed to create user profile:', createError);
                        // THROW to prevent login
                        updateAuthState({ isLoading: false, isAuthenticated: false });
                        throw new Error('User profile could not be loaded or created.');
                    }
                    userData = newUser;
                } else {
                    updateAuthState({ isLoading: false, isAuthenticated: false });
                    throw new Error('No authenticated user found.');
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

            // 🔍 ROLE DETERMINATION
            let roleEnum: Role | null = null;
            const dbRole = userData?.role?.toLowerCase();

            if (dbRole === 'manager') roleEnum = Role.MANAGER;
            else if (dbRole === 'team_leader') roleEnum = Role.TEAM_LEADER;
            else if (dbRole === 'bucket_runner' || dbRole === 'runner') roleEnum = Role.RUNNER;

            // If role is unknown/null, we DO NOT default to Team Leader.
            // We set it to null, which will be caught by Routing or Login.

            if (!roleEnum) {
                console.warn(`[AuthContext] Unknown role "${dbRole}" for user ${userId}. Access Denied.`);
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
            console.error('[AuthContext] Critical Error loading user data:', error);
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
