"use client";

import { useState, useEffect } from 'react';
import { authClient, AuthState } from '../auth-client';

export function useAuth() {
  const [state, setState] = useState<AuthState>(authClient.getState());

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authClient.subscribe(setState);

    // Initial fetch if not already loading
    if (state.isLoading) {
      authClient.fetchUser();
    }

    return unsubscribe;
  }, []);

  return {
    user: state.user,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    login: authClient.login.bind(authClient),
    signup: authClient.signup.bind(authClient),
    logout: authClient.logout.bind(authClient),
    refresh: authClient.fetchUser.bind(authClient),
  };
}