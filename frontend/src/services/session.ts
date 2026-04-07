export type UserRole = 'Admin' | 'Analyst' | 'User';

const ROLE_ALIASES: Record<string, UserRole> = {
  Admin: 'Admin',
  Analyst: 'Analyst',
  User: 'User',
  Public: 'User',
  'Lead Analyst': 'Analyst',
  'Traffic Flow Engineer': 'Analyst',
  'City Planning Division': 'User',
  'System Administrator': 'Admin',
};

export const normalizeRole = (role: string | null | undefined): UserRole => {
  if (!role) return 'User';
  return ROLE_ALIASES[role] ?? 'User';
};

const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 
  (isLocal ? 'http://127.0.0.1:8001/api' : 'https://nexus-mobility-backend.onrender.com/api');

export const getToken = () => sessionStorage.getItem('nexus_token') || localStorage.getItem('nexus_token');

export const getCurrentRole = (): UserRole => {
  const role = sessionStorage.getItem('role') || localStorage.getItem('role');
  const normalized = normalizeRole(role);
  // Ensure we sync it to session for this tab's isolation
  if (role && !sessionStorage.getItem('role')) {
    sessionStorage.setItem('role', normalized);
  }
  return normalized;
};

export const getCurrentUserId = () => sessionStorage.getItem('user_id') || localStorage.getItem('user_id') || 'guest';
export const getCurrentUserName = () => sessionStorage.getItem('name') || localStorage.getItem('name') || 'System User';
export const getCurrentUserEmail = () => sessionStorage.getItem('email') || localStorage.getItem('email') || '';

export const logout = () => {
  sessionStorage.removeItem('nexus_token');
  sessionStorage.removeItem('role');
  sessionStorage.removeItem('user_id');
  sessionStorage.removeItem('name');
  sessionStorage.removeItem('email');
  
  localStorage.removeItem('nexus_token');
  localStorage.removeItem('role');
  localStorage.removeItem('user_id');
  localStorage.removeItem('name');
};

export const setSession = (payload: {
  access_token: string;
  role: string;
  user_id?: string;
  name?: string;
}) => {
  // Save to sessionStorage for CURRENT tab isolation
  sessionStorage.setItem('nexus_token', payload.access_token);
  sessionStorage.setItem('role', normalizeRole(payload.role));
  if (payload.user_id) sessionStorage.setItem('user_id', payload.user_id);
  if (payload.name) sessionStorage.setItem('name', payload.name);
  if ((payload as any).email) sessionStorage.setItem('email', (payload as any).email);

  // Save to localStorage so NEW tabs can inherit this login
  localStorage.setItem('nexus_token', payload.access_token);
  localStorage.setItem('role', normalizeRole(payload.role));
  if (payload.user_id) localStorage.setItem('user_id', payload.user_id);
  if (payload.name) localStorage.setItem('name', payload.name);
  if ((payload as any).email) localStorage.setItem('email', (payload as any).email);
};

export const getDefaultRouteForRole = (_role?: UserRole) => {
  return '/dashboard';
};

export const hasRoleAccess = (role: UserRole, allowedRoles?: UserRole[]) => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(role);
};
