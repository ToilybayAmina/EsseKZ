import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';

// Local PNG artwork, displayed with its intrinsic proportions.
export function AuthOrnament({ className = '' }: { className?: string }) {
  return (
    <img
      className={`auth-ornament ${className}`}
      src="/ornaments/EsseKZ_center_ornament.png"
      width={2172}
      height={724}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}

export function AuthBrand() {
  return (
    <div className="auth-brand">
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
        <div className="auth-form-content">{children}</div>
      </section>
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
        <img
          key={corner}
          className={`auth-corner auth-corner-${corner}`}
          src="/ornaments/EsseKZ_corner_ornament.png"
          width={1254}
          height={1254}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
      ))}
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
