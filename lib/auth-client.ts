import { SessionUser } from './session';

export interface AuthState {
  user: SessionUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Client-side auth utilities
export class AuthClient {
  private static instance: AuthClient;
  private authState: AuthState = {
    user: null,
    isLoading: true,
    isAuthenticated: false,
  };
  private listeners: ((state: AuthState) => void)[] = [];

  private constructor() {}

  static getInstance(): AuthClient {
    if (!AuthClient.instance) {
      AuthClient.instance = new AuthClient();
    }
    return AuthClient.instance;
  }

  // Subscribe to auth state changes
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Get current auth state
  getState(): AuthState {
    return { ...this.authState };
  }

  // Notify all listeners
  private notify() {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // Fetch current user from API
  async fetchUser(): Promise<SessionUser | null> {
    try {
      this.authState.isLoading = true;
      this.notify();

      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        this.authState.user = data.user;
        this.authState.isAuthenticated = true;
      } else {
        this.authState.user = null;
        this.authState.isAuthenticated = false;
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      this.authState.user = null;
      this.authState.isAuthenticated = false;
    } finally {
      this.authState.isLoading = false;
      this.notify();
    }

    return this.authState.user;
  }

  // Login
  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        await this.fetchUser(); // Refresh user state
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Network error' };
    }
  }

  // Signup
  async signup(email: string, password: string, firstName: string, lastName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Signup failed:', error);
      return { success: false, error: 'Network error' };
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });
      this.authState.user = null;
      this.authState.isAuthenticated = false;
      this.notify();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
}

// Export singleton instance
export const authClient = AuthClient.getInstance();