import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Feather, Mail } from 'lucide-react';
import type { User } from '../../shared/schema';
import { post } from '../api';
import { useApp } from '../context';
import { ErrorBox } from '../components';
import { AuthLayout, AuthField, AuthButton } from '../auth-components';
import '../auth.css';

export function Auth({ mode }: { mode: 'login' | 'register' | 'forgot' | 'reset' }) {
  const { user, setUser, loading, health } = useApp();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);
  const choosingPassword = mode === 'reset' || (mode === 'forgot' && Boolean(challengeId));
  useEffect(() => {
    if (!resendSeconds) return;
    const timer = setTimeout(() => setResendSeconds((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);
  useEffect(() => {
    setError('');
    setMessage(
      mode === 'login' && location.state?.reset
        ? 'Құпия сөз жаңартылды. Жаңа құпия сөзбен кіріңіз.'
        : '',
    );
    setPassword('');
    setConfirm('');
    setChallengeId('');
    setCode('');
    setResendSeconds(0);
  }, [mode, location.key]);
  const rawNext = search.get('next') || '/generate';
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('\\')
      ? rawNext
      : '/generate';
  if (user && !loading && ['login', 'register'].includes(mode))
    return <Navigate to={next} replace />;
  const title = {
    login: 'Қайта оралғаныңа қуаныштымыз.',
    register: 'Өз кеңістігіңді баста.',
    forgot: 'Құпия сөзіңді қалпына келтір.',
    reset: 'Жаңа құпия сөз',
  }[mode];
  async function requestCode() {
    const r = await post<{ challengeId: string; message: string }>(
      mode === 'register' ? '/auth/register' : '/auth/forgot-password',
      mode === 'register' ? { name, email, password } : { email },
    );
    setChallengeId(r.challengeId);
    setCode('');
    setMessage(r.message);
    setResendSeconds(60);
  }
  async function resend() {
    setBusy(true);
    setError('');
    try {
      await requestCode();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    if ((mode === 'register' || choosingPassword) && password !== confirm)
      return setError('Құпия сөздер сәйкес келмейді.');
    setBusy(true);
    try {
      if ((mode === 'forgot' || mode === 'register') && !challengeId) {
        await requestCode();
      } else if (mode === 'register') {
        const r = await post<{ user: User }>('/auth/verify-registration', { challengeId, code });
        setUser(r.user);
        setPassword('');
        setConfirm('');
        navigate(next, { replace: true });
      } else if (choosingPassword) {
        const r = await post<{ message: string }>('/auth/reset-password', {
          ...(mode === 'reset' ? { token: search.get('token') } : { challengeId, code }),
          password,
        });
        setUser(null);
        setMessage(r.message);
        setPassword('');
        setConfirm('');
        setChallengeId('');
        setCode('');
        if (mode === 'forgot') navigate('/login', { replace: true, state: { reset: true } });
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
    <AuthLayout key={mode}>
      <Link to="/" className="back-link">
        <ArrowLeft size={15} />
        Басты бетке
      </Link>
      <h2 id="auth-title">{title}</h2>
      <p>
        {mode === 'login'
          ? 'Жеке кеңістігіңе кіріп, ойыңды жалғастыр.'
          : mode === 'register'
            ? 'EsseKZ әлеміне қосылып, алғашқы эссеңді жаз.'
            : mode === 'forgot'
              ? 'Электрондық поштаңды енгіз. Құпия сөзіңді жаңарту үшін поштаңа растау кодын жібереміз.'
              : 'Жаңа құпия сөзді енгізіп, аккаунтыңа қайта кір.'}
      </p>
      {(mode === 'forgot' || mode === 'register') && health && !health.passwordResetConfigured && (
        <div className="info-banner">
          <Mail size={18} />
          <p>Пошта қызметі әлі бапталмаған. Растау коды әзірше жіберілмейді.</p>
        </div>
      )}
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          {mode === 'register' && !challengeId && (
            <>
              <AuthField
                label="Аты-жөнің"
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
          {mode !== 'reset' && !challengeId && (
            <>
              <AuthField
                label="Электрондық пошта"
                icon={<Mail size={20} />}
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
          {(mode === 'login' || choosingPassword || (mode === 'register' && !challengeId)) && (
            <>
              <AuthField
                label="Құпия сөз"
                id="password"
                type={show ? 'text' : 'password'}
                required
                minLength={8}
                maxLength={128}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Кемінде 8 таңба"
                action={
                  <button
                    type="button"
                    className="auth-password-toggle"
                    aria-label={show ? 'Құпия сөзді жасыру' : 'Құпия сөзді көрсету'}
                    aria-pressed={show}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={21} /> : <Eye size={21} />}
                  </button>
                }
              />
            </>
          )}
          {((mode === 'register' && !challengeId) || choosingPassword) && (
            <>
              <AuthField
                label="Құпия сөзді растау"
                error={error === 'Құпия сөздер сәйкес келмейді.' ? error : undefined}
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
          {challengeId && (
            <>
              <p>
                {email} мекенжайына жіберілген кодты енгізіңіз. Хат келмесе, «Спам» папкасын
                тексеріңіз.
              </p>
              <AuthField
                label="Растау коды"
                id="verification-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                minLength={6}
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="6 таңбалы код"
              />
              <button
                type="button"
                className="button secondary"
                disabled={busy || resendSeconds > 0}
                onClick={resend}
              >
                {resendSeconds > 0 ? `Қайта жіберу (${resendSeconds} с)` : 'Кодты қайта жіберу'}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setChallengeId('');
                  setCode('');
                  setError('');
                  setMessage('');
                }}
              >
                Email өзгерту
              </button>
            </>
          )}
          {mode === 'login' && (
            <div className="forgot-link">
              <Link to="/forgot-password">Құпия сөзді ұмыттыңыз ба?</Link>
            </div>
          )}
          {mode === 'register' && !challengeId && (
            <label className="checkbox-label terms-checkbox">
              <input type="checkbox" required />
              <span>
                <Link to="/terms">Қолдану шарттары</Link> мен{' '}
                <Link to="/privacy">құпиялық саясатын</Link> қабылдаймын.
              </span>
            </label>
          )}
          {error && error !== 'Құпия сөздер сәйкес келмейді.' && <ErrorBox>{error}</ErrorBox>}
          {message && (
            <div className="success-box auth-feedback" role="status">
              {challengeId && <Mail size={22} aria-hidden="true" />}
              <div>
                {challengeId && <strong>Хат жіберілді!</strong>}
                {message}
              </div>
              {mode === 'reset' && <Link to="/login">Аккаунтқа кіру →</Link>}
            </div>
          )}
          <AuthButton busy={busy} disabled={mode === 'reset' && Boolean(message)}>
            {mode === 'login'
              ? 'Кіру'
              : mode === 'register'
                ? challengeId
                  ? 'Поштаны растау'
                  : 'Тіркелу'
                : mode === 'forgot' && !challengeId
                  ? 'Код жіберу'
                  : 'Құпия сөзді сақтау'}
          </AuthButton>
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
    </AuthLayout>
  );
}
