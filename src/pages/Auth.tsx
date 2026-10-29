import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Feather,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from 'lucide-react';
import type { User } from '../../shared/schema';
import { post } from '../api';
import { useApp } from '../context';
import { ErrorBox, Ornament } from '../components';

export function Auth({ mode }: { mode: 'login' | 'register' | 'forgot' | 'reset' }) {
  const { user, setUser, loading, health } = useApp();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    setError('');
    setMessage('');
    setPassword('');
    setConfirm('');
  }, [mode]);
  const rawNext = search.get('next') || '/generate';
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('\\')
      ? rawNext
      : '/generate';
  if (user && !loading && ['login', 'register'].includes(mode))
    return <Navigate to={next} replace />;
  const title = {
    login: 'Қайта оралғаныңа қуаныштымыз.',
    register: 'Жазу жолыңды баста.',
    forgot: 'Құпия сөзді жаңарту',
    reset: 'Жаңа құпия сөз',
  }[mode];
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    if ((mode === 'register' || mode === 'reset') && password !== confirm)
      return setError('Құпия сөздер сәйкес келмейді.');
    setBusy(true);
    try {
      if (mode === 'forgot') {
        const r = await post<{ message: string }>('/auth/forgot-password', { email });
        setMessage(r.message);
      } else if (mode === 'reset') {
        const r = await post<{ message: string }>('/auth/reset-password', {
          token: search.get('token'),
          password,
        });
        setUser(null);
        setMessage(r.message);
      } else {
        const r = await post<{ user: User }>(`/auth/${mode}`, { name, email, password });
        setUser(r.user);
        navigate(next, { replace: true });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container auth-container">
      <div className="auth-story">
        <span className="eyebrow">СӨЗІҢЕ ҚАНАТ БІТІР</span>
        <img src="/logo.svg" className="auth-logo" alt="EsseKZ логотипі" />
        <h1>
          Әр жақсы мәтін
          <br />
          <span>өзіңнен басталады.</span>
        </h1>
        <Ornament />
        <p>
          Ойыңды жинақта. Шабытыңды сақта.
          <br />
          Қазақ тілінде еркін жаз.
        </p>
        <div className="auth-perks">
          <span>
            <Check size={16} />
            Жеке жұмыс кеңістігі
          </span>
          <span>
            <Check size={16} />
            Сақталған эсселер тарихы
          </span>
          <span>
            <Check size={16} />
            Үш форматта экспорттау
          </span>
        </div>
        <span className="story-decoration" aria-hidden="true">
          ❧
        </span>
      </div>
      <section className="auth-form-panel">
        <Link to="/" className="back-link">
          <ArrowLeft size={15} />
          Басты бетке
        </Link>
        <div className="auth-form-icon">
          {mode === 'forgot' ? <Mail size={25} /> : <LockKeyhole size={25} />}
        </div>
        <h2>{title}</h2>
        <p>
          {mode === 'login'
            ? 'Жеке кеңістігіңе кіріп, ойыңды жалғастыр.'
            : mode === 'register'
              ? 'Аккаунт ашып, жұмыстарыңды бір жерде сақта.'
              : 'Email арқылы аккаунтыңа қолжетімділікті қалпына келтір.'}
        </p>
        {mode === 'forgot' && health && !health.passwordResetConfigured && (
          <div className="info-banner">
            <Mail size={18} />
            <p>Пошта қызметі әлі бапталмаған. Қалпына келтіру хаты әзірше жіберілмейді.</p>
          </div>
        )}
        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            {mode === 'register' && (
              <>
                <label htmlFor="name">Есіміңіз</label>
                <input
                  id="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Есіміңізді енгізіңіз"
                />
              </>
            )}
            {mode !== 'reset' && (
              <>
                <label htmlFor="email">Электрондық пошта</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </>
            )}
            {mode !== 'forgot' && (
              <>
                <label htmlFor="password">Құпия сөз</label>
                <div className="password-field">
                  <input
                    id="password"
                    type={show ? 'text' : 'password'}
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Кемінде 8 таңба"
                  />
                  <button
                    type="button"
                    aria-label={show ? 'Құпия сөзді жасыру' : 'Құпия сөзді көрсету'}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </>
            )}
            {(mode === 'register' || mode === 'reset') && (
              <>
                <label htmlFor="confirm">Құпия сөзді қайталаңыз</label>
                <input
                  id="confirm"
                  type={show ? 'text' : 'password'}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Құпия сөзді тағы енгізіңіз"
                />
              </>
            )}
            {mode === 'login' && (
              <div className="forgot-link">
                <Link to="/forgot-password">Құпия сөзді ұмыттыңыз ба?</Link>
              </div>
            )}
            {mode === 'register' && (
              <label className="checkbox-label terms-checkbox">
                <input type="checkbox" required />
                <span>
                  <Link to="/terms">Қолдану шарттары</Link> мен{' '}
                  <Link to="/privacy">құпиялық саясатын</Link> қабылдаймын.
                </span>
              </label>
            )}
            {error && <ErrorBox>{error}</ErrorBox>}
            {message && (
              <div className="success-box" role="status">
                {message}
                {mode === 'reset' && <Link to="/login">Аккаунтқа кіру →</Link>}
              </div>
            )}
            <button
              className="button gold full-width"
              disabled={busy || (mode === 'reset' && Boolean(message))}
              type="submit"
            >
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <>
                  {mode === 'login'
                    ? 'Кіру'
                    : mode === 'register'
                      ? 'Аккаунт ашу'
                      : mode === 'forgot'
                        ? 'Сілтеме жіберу'
                        : 'Құпия сөзді сақтау'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </fieldset>
        </form>
        <p className="auth-switch">
          {mode === 'login' ? (
            <>
              Әлі аккаунтыңыз жоқ па?{' '}
              <Link to={`/register?next=${encodeURIComponent(next)}`}>Тіркелу</Link>
            </>
          ) : mode === 'register' ? (
            <>
              Аккаунтыңыз бар ма? <Link to={`/login?next=${encodeURIComponent(next)}`}>Кіру</Link>
            </>
          ) : (
            <Link to="/login">Кіру бетіне оралу</Link>
          )}
        </p>
        <div className="auth-secure">
          <Feather size={14} />
          Сенің ойың. Сенің жеке кеңістігің.
        </div>
      </section>
    </div>
  );
}
