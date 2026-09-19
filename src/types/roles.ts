export type AppRole = 'DISPATCHER' | 'OPERATIONS_MANAGER' | 'HOSPITAL_OPERATOR' | 'ADMIN';

export interface RoleConfig {
  id: AppRole;
  role: AppRole;
  label: string;
  title: string;
  userBadge: string;
  userName: string;
  userRoleTag: string;
  defaultPath: string;
  allowedPaths: string[];
  description: string;
}

export const ROLE_CONFIGS: Record<AppRole, RoleConfig> = {
  DISPATCHER: {
    id: 'DISPATCHER',
    role: 'DISPATCHER',
    label: 'Dispatcher',
    title: 'Emergency Dispatcher',
    userBadge: 'SS',
    userName: 'Officer S. Sharma',
    userRoleTag: 'EOC Dispatcher #4',
    defaultPath: '/',
    allowedPaths: ['/', '/emergency-calls', '/live-operations', '/fleet', '/hospitals'],
    description: 'Primary emergency intake, AI-assisted triage verification, dispatch decision review, and hospital coordination.',
  },
  OPERATIONS_MANAGER: {
    id: 'OPERATIONS_MANAGER',
    role: 'OPERATIONS_MANAGER',
    label: 'Operations Manager',
    title: 'Operations Director',
    userBadge: 'RM',
    userName: 'Dr. R. Mehta',
    userRoleTag: 'EOC Operations Director',
    defaultPath: '/overview',
    allowedPaths: ['/overview', '/live-operations', '/fleet', '/hospitals', '/analytics'],
    description: 'Network-level command overview, fleet status monitoring, hospital network capacity, and performance analytics.',
  },
  HOSPITAL_OPERATOR: {
    id: 'HOSPITAL_OPERATOR',
    role: 'HOSPITAL_OPERATOR',
    label: 'Hospital Operator',
    title: 'Hospital ED Coordinator',
    userBadge: 'PK',
    userName: 'Nurse Supervisor P. Kaur',
    userRoleTag: 'City Emergency ED',
    defaultPath: '/hospital-operations',
    allowedPaths: ['/hospital-operations', '/hospitals'],
    description: 'Receiving hospital clinical portal: HL7 pre-alerts, ED bed availability, trauma team standby, and ambulance handover.',
  },
  ADMIN: {
    id: 'ADMIN',
    role: 'ADMIN',
    label: 'Admin',
    title: 'Systems Administrator',
    userBadge: 'AK',
    userName: 'SysAdmin A. Kumar',
    userRoleTag: 'Lead Systems Administrator',
    defaultPath: '/settings',
    allowedPaths: ['/settings', '/overview', '/analytics'],
    description: 'System configuration, operational parameters, notification thresholds, telemetry settings, and demo scenario controls.',
  },
};

export function canAccessRole(role: AppRole, path: string): boolean {
  const config = ROLE_CONFIGS[role];
  if (!config) return false;
  return config.allowedPaths.some((p) => p === path || (p !== '/' && path.startsWith(p)));
}

