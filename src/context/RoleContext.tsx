import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { type AppRole, type RoleConfig, ROLE_CONFIGS } from '../types/roles';

const STORAGE_KEY = 'rapidroute_v2_demo_role';

interface RoleContextType {
  currentRole: AppRole;
  currentConfig: RoleConfig;
  setDemoRole: (role: AppRole) => void;
  canAccess: (path: string) => boolean;
  availableRoles: RoleConfig[];
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRoleState] = useState<AppRole>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY) as AppRole | null;
        if (stored && ROLE_CONFIGS[stored]) {
          return stored;
        }
      }
    } catch {
      // Fallback if localStorage unavailable
    }
    return 'DISPATCHER';
  });

  const currentConfig = ROLE_CONFIGS[currentRole];

  const setDemoRole = useCallback((role: AppRole) => {
    if (ROLE_CONFIGS[role]) {
      setCurrentRoleState(role);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, role);
        }
      } catch (err) {
        console.warn('[RoleContext] Failed to persist role to localStorage:', err);
      }
    }
  }, []);

  const canAccess = useCallback(
    (path: string): boolean => {
      const normalized = path.split('?')[0]; // Strip query params
      const allowed = ROLE_CONFIGS[currentRole].allowedPaths;
      return allowed.includes(normalized) || (normalized === '/emergency-calls' && allowed.includes('/'));
    },
    [currentRole]
  );

  const availableRoles = Object.values(ROLE_CONFIGS);

  return (
    <RoleContext.Provider
      value={{
        currentRole,
        currentConfig,
        setDemoRole,
        canAccess,
        availableRoles,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextType {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
