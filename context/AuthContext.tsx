import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { AppUser, Role, UserRole } from '../types';

interface AuthState {
  user: User | null;
  appUser: AppUser | null;
  currentRole: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  userName: string;
  userEmail: string;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  completeSetup: (role: Role, name: string, email: string) => void; // Demo mode support
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    appUser: null,
    currentRole: null,
    isAuthenticated: false,
    isLoading: true,
    userName: '',
    userEmail: '',
  });

  const updateState = useCallback((updates: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        console.log('[AuthContext] User not found in users table, creating profile...');
        const { data: authData } = await supabase.auth.getUser();
        const authUser = authData?.user;

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
          console.error('[AuthContext] Error creating user profile:', createError);
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

      // Determine role enum
      let roleEnum = Role.TEAM_LEADER;
      if (userData?.role === 'manager') roleEnum = Role.MANAGER;
      if (userData?.role === 'bucket_runner') roleEnum = Role.RUNNER;

      updateState({
        user: { id: userId } as User,
        appUser: userData as AppUser,
        currentRole: roleEnum,
        userName: userData?.full_name || '',
        userEmail: userData?.email || '',
        isAuthenticated: true,
        isLoading: false,
      });

    } catch (error) {
      console.error('[AuthContext] Error loading user profile:', error);
      updateState({ isLoading: false });
    }
  };

  const signIn = async (email: string, password: string) => {
    updateState({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        await loadUserProfile(data.user.id);
      }
    } catch (error: any) {
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
        if (profileError) console.error('Error creating profile:', profileError);
        await loadUserProfile(data.user.id);
      }
    } catch (error) {
      updateState({ isLoading: false });
      throw error;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({
      user: null,
      appUser: null,
      currentRole: null,
      isAuthenticated: false,
      isLoading: false,
      userName: '',
      userEmail: '',
    });
  };

  const completeSetup = (role: Role, name: string, email: string) => {
     const userRoleMap: Record<Role, UserRole> = {
      [Role.MANAGER]: 'manager',
      [Role.TEAM_LEADER]: 'team_leader',
      [Role.RUNNER]: 'bucket_runner',
    };

    const appUser: AppUser = {
      id: Math.random().toString(36).substring(2, 11),
      email: email,
      full_name: name,
      role: userRoleMap[role],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    updateState({
      user: { id: 'demo-id' } as User,
      appUser,
      currentRole: role,
      userName: name,
      userEmail: email,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        updateState({ isLoading: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Only load if not already authenticated to avoid double load?
        // Or if ID changed.
        loadUserProfile(session.user.id);
      } else {
        signOut();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, completeSetup }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
