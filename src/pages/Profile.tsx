import { startTransition, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarDays,
  FileText,
  LogOut,
  Mail,
  Save,
  ShieldCheck,
} from 'lucide-react';
import type { User } from '../../shared/schema';
import { useApp } from '../context';
import { api, post } from '../api';
import { ErrorBox, PageHeading } from '../components';
export function Profile() {
  const { user, setUser, notify } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api<{ user: User }>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name }),
      });
      setUser(r.user);
      notify('Профиль жаңартылды.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await post('/auth/logout', {});
      startTransition(() => {
        setUser(null);
        navigate('/', { replace: true });
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="container page-container">
      <PageHeading
        eyebrow="ЖЕКЕ КЕҢІСТІГІҢ"
        title="Өзің туралы бірер сөз."
        text="Профиліңді ретте. Жазу жолыңды жалғастыр."
      />
      <div className="profile-layout">
        <div className="panel profile-card">
          <div className="profile-avatar">{user?.name[0]?.toUpperCase()}</div>
          <h2>{user?.name}</h2>
          <span>EsseKZ қаламгері</span>
          <OrnamentalLine />
          <p>
            <Mail size={16} />
            {user?.email}
          </p>
          <p>
            <CalendarDays size={16} />{' '}
            {user && new Date(user.created_at).toLocaleDateString('kk-KZ')} бастап
          </p>
          <Link className="button outline full-width" to="/history">
            <FileText size={17} />
            Менің эсселерім
          </Link>
        </div>
        <section className="panel profile-settings">
          <h2>Профиль деректері</h2>
          <p>Осы есім жеке кеңістігіңде көрсетіледі.</p>
          <form onSubmit={save}>
            <label htmlFor="profile-name">Есіміңіз</label>
            <input
              id="profile-name"
              minLength={2}
              maxLength={80}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label htmlFor="profile-email">Электрондық пошта</label>
            <input id="profile-email" type="email" value={user?.email || ''} readOnly />
            <p className="field-help">Email — аккаунтыңыздың тұрақты идентификаторы.</p>
            {error && <ErrorBox>{error}</ErrorBox>}
            <button disabled={busy || name === user?.name} className="button gold" type="submit">
              <Save size={17} />
              {busy ? 'Сақталуда…' : 'Өзгерістерді сақтау'}
            </button>
          </form>
          <div className="form-divider" />
          <h3>
            <ShieldCheck size={19} />
            Аккаунт қауіпсіздігі
          </h3>
          <p>Құпия сөзді жаңарту үшін пошта арқылы қалпына келтіруді пайдаланыңыз.</p>
          <Link to="/forgot-password" className="text-button">
            Құпия сөзді қалпына келтіру <ArrowUpRight size={16} />
          </Link>
          <div className="form-divider" />
          <button onClick={logout} className="text-button muted">
            <LogOut size={17} />
            Аккаунттан шығу
          </button>
        </section>
      </div>
    </div>
  );
}
function OrnamentalLine() {
  return <div className="profile-line">◇</div>;
}
