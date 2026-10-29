import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  LogOut,
  Menu,
  X,
  LoaderCircle,
  Feather,
  Instagram,
  Mail,
} from 'lucide-react';
import { startTransition, useState, useEffect, type ReactNode } from 'react';
import { useApp } from './context';
import { post } from './api';
export function Ornament({ className = '' }: { className?: string }) {
  return (
    <svg className={`ornament ${className}`} viewBox="0 0 250 40" fill="none" aria-hidden="true">
      <path
        d="M0 20H78Q60 20 62 10T79 8Q90 11 82 17Q74 20 74 14M250 20H172Q190 20 188 10T171 8Q160 11 168 17Q176 20 176 14M78 20Q98 5 109 20Q98 35 78 20ZM172 20Q152 5 141 20Q152 35 172 20ZM109 20 125 4 141 20 125 36ZM116 20 125 11 134 20 125 29Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
export function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <Link
      to="/"
      className={`brand ${footer ? 'brand-footer' : ''}`}
      aria-label="EsseKZ — басты бет"
    >
      <img src="/logo.svg" alt="Алтын қаламұш пен қанатты EsseKZ логотипі" />
      <div>
        Esse<span>KZ</span>
        <small>ОЙ. СӨЗ. ШАБЫТ.</small>
      </div>
    </Link>
  );
}
export function Header() {
  const { user, setUser, notify } = useApp();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  async function logout() {
    try {
      await post('/auth/logout', {});
      startTransition(() => {
        setUser(null);
        navigate('/', { replace: true });
      });
      notify('Аккаунттан шықтыңыз.');
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <button
          className="menu-button icon-button"
          aria-label="Мәзір"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav className={open ? 'navigation open' : 'navigation'} aria-label="Негізгі навигация">
          {[
            ['/', 'Басты бет'],
            ['/generate', 'Эссе жазу'],
            ['/about', 'Өмірбаян'],
            ['/history', 'Тарих'],
          ].map(([url, label]) => (
            <Link key={url} to={url} className={location.pathname === url ? 'active' : ''}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <span className="locale">
            ҚАЗ <ChevronDown size={12} />
          </span>
          {user ? (
            <>
              <Link className="button gold small" to="/profile">
                {user.name.split(' ')[0]}
              </Link>
              <button className="icon-button logout" onClick={logout} aria-label="Аккаунттан шығу">
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <Link className="button gold small" to="/login">
              Кіру <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <Brand footer />
            <p>
              Қазақша ойла. Сенімді жаз.
              <br />
              Әр сөзіңнің өз орны бар.
            </p>
          </div>
          <div>
            <h3>Платформа</h3>
            <Link to="/about">Біз туралы</Link>
            <Link to="/generate">Эссе жазу</Link>
            <Link to="/history">Жұмыстар тарихы</Link>
          </div>
          <div>
            <h3>Көмек</h3>
            <Link to="/faq">Жиі қойылатын сұрақтар</Link>
            <Link to="/privacy">Құпиялық саясаты</Link>
            <Link to="/terms">Қолдану шарттары</Link>
          </div>
          <div className="footer-note">
            <h3>Сөзден басталады.</h3>
            <p>
              Тілге құрмет.
              <br />
              Ойға еркіндік. Шабытқа жол.
            </p>
            <Feather size={30} strokeWidth={1} />
          </div>
        </div>
        <Ornament />
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} EsseKZ. Барлық құқықтар қорғалған.</span>
          <span>
            Қазақ тіліндегі шығармашылық кеңістік <span className="gold-text">✦</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
export function PageHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="page-heading">
      <div className="eyebrow">✦ {eyebrow}</div>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}
export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div className="error-box" role="alert">
      {children}
    </div>
  );
}
export function Loading({ text = 'Жүктелуде…' }: { text?: string }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={24} />
      {text}
    </div>
  );
}
export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-feather">
        <Feather size={35} strokeWidth={1} />
      </div>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}
