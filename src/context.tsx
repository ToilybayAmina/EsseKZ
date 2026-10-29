import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '../shared/schema';
import { api } from './api';
type Health = { aiConfigured: boolean; passwordResetConfigured: boolean };
const Context = createContext<{
  user: User | null;
  setUser: (u: User | null) => void;
  loading: boolean;
  health: Health | null;
  notify: (text: string) => void;
}>({ user: null, setUser: () => {}, loading: true, health: null, notify: () => {} });
export const useApp = () => useContext(Context);
export function Provider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<Health | null>(null);
  const [toast, setToast] = useState('');
  useEffect(() => {
    api<{ user: User | null }>('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => {})
      .finally(() => setLoading(false));
    api<Health>('/health')
      .then(setHealth)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  return (
    <Context.Provider value={{ user, setUser, loading, health, notify: setToast }}>
      {children}
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button onClick={() => setToast('')} aria-label="Жабу">
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
