import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';

// A mirrored qoshqar-muiz (ram's horn) motif with a central diamond.
// Decorative SVGs never enter the focus or accessibility tree.
export function AuthOrnament({ className = '' }: { className?: string }) {
  const horn =
    'M4 58H25C47 58 63 44 63 27C63 12 52 3 39 3C25 3 15 13 15 25C15 36 23 43 32 43C41 43 47 37 47 30C47 24 43 20 38 21C42 27 39 32 34 32C28 32 26 28 26 24C26 17 32 13 39 13C47 13 52 19 52 27C52 39 40 47 25 47H4Z';
  return (
    <svg
      className={`auth-ornament ${className}`}
      viewBox="0 0 260 90"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={horn} transform="translate(140 5)" />
      <path d={horn} transform="translate(120 5) scale(-1 1)" />
      <path d="M130 17 143 37 130 57 117 37ZM130 26 123 37 130 48 137 37Z" fillRule="evenodd" />
      <path d="M130 62 140 74 130 86 120 74Z" />
      <path d="M0 59H53V61H0ZM207 59H260V61H207Z" />
    </svg>
  );
}

export function AuthBrand() {
  return (
    <div className="auth-brand">
      <AuthOrnament className="auth-corner auth-corner-brand-top" />
      <AuthOrnament className="auth-corner auth-corner-brand-bottom" />
      <div className="auth-light-trails" aria-hidden="true" />
      <div className="auth-particles" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <span className="auth-brand-eyebrow">СӨЗІҢЕ ҚАНАТ БІТІР</span>
      <div className="auth-logo-halo">
        <img src="/logo.svg" className="auth-brand-logo" alt="EsseKZ логотипі" />
      </div>
      <h1>
        Әр жақсы мәтін
        <br />
        <span>өзіңнен басталады.</span>
      </h1>
      <AuthOrnament className="auth-brand-divider" />
      <p>
        Ойыңды жинақта. Шабытыңды сақта.
        <br />
        Қазақ тілінде еркін жаз.
      </p>
    </div>
  );
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container auth-container auth-shell">
      <AuthBrand />
      <section className="auth-form-panel" aria-labelledby="auth-title">
        <AuthOrnament className="auth-corner auth-corner-form-top" />
        <AuthOrnament className="auth-corner auth-corner-form-bottom" />
        <div className="auth-form-content">{children}</div>
      </section>
    </div>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  icon?: ReactNode;
  action?: ReactNode;
  error?: string;
};
export function AuthField({
  id,
  label,
  icon,
  action,
  error,
  onChange,
  onInvalid,
  ...props
}: FieldProps) {
  const [invalid, setInvalid] = useState('');
  const message = error || invalid;
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className={`auth-input-wrap${icon ? ' has-icon' : ''}${action ? ' has-action' : ''}`}>
        {icon && (
          <span className="auth-input-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          {...props}
          id={id}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? `${id}-error` : undefined}
          onChange={(event) => {
            setInvalid('');
            onChange?.(event);
          }}
          onInvalid={(event) => {
            const validity = event.currentTarget.validity;
            setInvalid(
              validity.valueMissing
                ? 'Бұл өрісті толтырыңыз.'
                : validity.typeMismatch
                  ? 'Email мекенжайын дұрыс енгізіңіз.'
                  : validity.tooShort
                    ? `Кемінде ${props.minLength} таңба енгізіңіз.`
                    : validity.patternMismatch
                      ? '6 таңбалы кодты енгізіңіз.'
                      : 'Енгізілген деректерді тексеріңіз.',
            );
            onInvalid?.(event);
          }}
        />
        {action}
      </div>
      {message && (
        <p className="auth-field-error" id={`${id}-error`} role="alert">
          {message}
        </p>
      )}
    </div>
  );
}

export function AuthButton({
  busy,
  disabled,
  children,
}: {
  busy: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      className="button gold full-width auth-submit"
      disabled={busy || disabled}
      type="submit"
      aria-busy={busy}
    >
      {busy ? (
        <>
          <LoaderCircle className="spin" size={21} aria-hidden="true" />
          <span>Күте тұрыңыз…</span>
        </>
      ) : (
        <>
          {children}
          <ArrowRight size={23} aria-hidden="true" />
        </>
      )}
    </button>
  );
}
