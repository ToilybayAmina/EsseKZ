import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  FileText,
  Info,
  LoaderCircle,
  PenLine,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  audiences,
  defaults,
  essayTypes,
  parametersSchema,
  styles,
  wordOptions,
  type Essay,
  type Parameters,
} from '../../shared/schema';
import { useApp } from '../context';
import { post } from '../api';
import { ErrorBox, Ornament, PageHeading } from '../components';

function initial(): Parameters {
  try {
    const value = JSON.parse(sessionStorage.getItem('essekz-parameters') || 'null');
    if (value && typeof value === 'object') return { ...defaults, ...value };
  } catch {}
  return { ...defaults };
}
export function Generate() {
  const { user, health, loading } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useState<Parameters>(() =>
    parametersSchema.safeParse(location.state?.parameters).success
      ? location.state.parameters
      : initial(),
  );
  const [manual, setManual] = useState(false);
  const [text, setText] = useState(() => {
    try {
      return sessionStorage.getItem('essekz-draft') || '';
    } catch {
      return '';
    }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      sessionStorage.setItem('essekz-parameters', JSON.stringify(params));
    } catch {}
  }, [params]);
  useEffect(() => {
    try {
      sessionStorage.setItem('essekz-draft', text);
    } catch {}
  }, [text]);
  function update<K extends keyof Parameters>(key: K, value: Parameters[K]) {
    setParams((p) => ({ ...p, [key]: value }));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!user) return navigate('/login?next=/generate');
    if (!parametersSchema.safeParse(params).success)
      return setError('Тақырып кемінде 3 таңбадан тұруы керек. Параметрлерді тексеріңіз.');
    setBusy(true);
    try {
      const data = await post<{ essay: Essay }>(
        manual ? '/essays' : '/essays/generate',
        manual ? { ...params, essayText: text } : params,
      );
      if (manual) {
        setText('');
        try {
          sessionStorage.removeItem('essekz-draft');
        } catch {}
      }
      navigate(`/result/${data.essay.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page-container">
      <PageHeading
        eyebrow="СЕНІҢ ОЙЫҢ. СЕНІҢ ДАУЫСЫҢ."
        title="Жаңа ойға қанат бер."
        text="Тақырыбыңды таңда. Бағытыңды анықта. Алғашқы сөйлемнен баста."
      />
      <div className="generate-layout">
        <section className="panel generator-panel">
          <div className="mode-tabs">
            <button
              className={!manual ? 'selected' : ''}
              onClick={() => {
                setManual(false);
                setError('');
              }}
            >
              <Sparkles size={17} />
              AI арқылы жазу
            </button>
            <button
              className={manual ? 'selected' : ''}
              onClick={() => {
                setManual(true);
                setError('');
              }}
            >
              <PenLine size={17} />
              Өзім жазамын
            </button>
          </div>
          {!manual && !health?.aiConfigured && (
            <div className="info-banner">
              <Info size={19} />
              <div>
                <strong>Gemini-ді келесі қадамда қосамыз</strong>
                <p>
                  Параметрлерді қазір дайындай аласыз. Өз мәтініңізді сақтау үшін «Өзім жазамын»
                  бөлімін таңдаңыз.
                </p>
              </div>
            </div>
          )}
          <form onSubmit={submit} className="generator-form">
            <fieldset disabled={busy}>
              <div className="form-section-title">
                <span>01</span>
                <div>
                  <h2>Не туралы жазамыз?</h2>
                  <p>Мәтіннің негізі — сенің ойың.</p>
                </div>
              </div>
              <label htmlFor="title">
                Эссе тақырыбы <span className="required">*</span>
              </label>
              <input
                id="title"
                required
                minLength={3}
                maxLength={200}
                value={params.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="Мысалы: Білім — болашақтың кілті"
              />
              <div className="input-meta">
                <span>Нақты тақырып — мазмұнды мәтіннің бастауы</span>
                <span>{params.title.length}/200</span>
              </div>
              <label htmlFor="thesis">
                Тезис / негізгі ой <span className="optional">міндетті емес</span>
              </label>
              <textarea
                id="thesis"
                rows={3}
                maxLength={2000}
                value={params.thesis}
                onChange={(e) => update('thesis', e.target.value)}
                placeholder="Осы тақырыпта қандай ойды жеткізгіңіз келеді?"
              />
              <div className="topic-chips">
                <span>Шабыт үшін:</span>
                {['Ана тілім — асыл қазынам', 'Технология және адам', 'Табиғатқа қамқорлық'].map(
                  (t) => (
                    <button type="button" key={t} onClick={() => update('title', t)}>
                      {t}
                    </button>
                  ),
                )}
              </div>
              <div className="form-divider" />
              <div className="form-section-title">
                <span>02</span>
                <div>
                  <h2>Мәтінді өзіңе бейімде</h2>
                  <p>Әр детальдың өз мәні бар.</p>
                </div>
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="essay-type">Эссе түрі</label>
                  <select
                    id="essay-type"
                    value={params.essayType}
                    onChange={(e) => update('essayType', e.target.value as Parameters['essayType'])}
                  >
                    {essayTypes.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="style">Жазу стилі</label>
                  <select
                    id="style"
                    value={params.style}
                    onChange={(e) => update('style', e.target.value as Parameters['style'])}
                  >
                    {styles.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="audience">Кімге арналған?</label>
                  <select
                    id="audience"
                    value={params.audience}
                    onChange={(e) => update('audience', e.target.value as Parameters['audience'])}
                  >
                    {audiences.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="arguments">Дәлелдер саны</label>
                  <select
                    id="arguments"
                    value={params.argumentsCount}
                    onChange={(e) => update('argumentsCount', Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} дәлел
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <label>
                Мәтін көлемі <span className="optional">сөз саны</span>
              </label>
              <div className="word-picker" role="group" aria-label="Сөз саны">
                {wordOptions.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={params.targetWordCount === n}
                    onClick={() => update('targetWordCount', n)}
                    className={params.targetWordCount === n ? 'selected' : ''}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="checkbox-grid">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={params.includeCounterargument}
                    onChange={(e) => update('includeCounterargument', e.target.checked)}
                  />
                  <span>
                    <strong>Қарсы пікір қосу</strong>
                    <small>Тақырыпқа басқа қырынан қарау</small>
                  </span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={params.includeSources}
                    onChange={(e) => update('includeSources', e.target.checked)}
                  />
                  <span>
                    <strong>Дереккөздер қосу</strong>
                    <small>Сілтемелерді өзіңіз де тексеріңіз</small>
                  </span>
                </label>
              </div>
              {manual && (
                <>
                  <div className="form-divider" />
                  <label htmlFor="manual-text">
                    Сенің мәтінің <span className="required">*</span>
                  </label>
                  <textarea
                    id="manual-text"
                    required
                    rows={12}
                    maxLength={30000}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Алғашқы сөйлеміңді осында жаз…"
                  />
                  <p className="field-help">
                    Бұл мәтін AI арқылы жазылған деп белгіленбейді. Өз жұмысыңыз ретінде сақталады.
                  </p>
                </>
              )}
              {error && <ErrorBox>{error}</ErrorBox>}
              <button
                className="button gold full-width generate-button"
                disabled={busy || loading || (!manual && !health?.aiConfigured)}
                type="submit"
              >
                {busy ? (
                  <>
                    <LoaderCircle className="spin" size={20} />
                    {manual ? 'Сақталып жатыр…' : 'Эссе жазылып жатыр…'}
                  </>
                ) : (
                  <>
                    {manual ? <PenLine size={19} /> : <Sparkles size={19} />}{' '}
                    {user ? (manual ? 'Мәтінді сақтау' : 'Эссе жазу') : 'Кіріп, жалғастыру'}
                    <ArrowRight size={19} />
                  </>
                )}
              </button>
              {!manual && (
                <p className="field-help centered">
                  AI мәтіні дайындалғанда осы бетті ашық қалдырыңыз.
                </p>
              )}
            </fieldset>
          </form>
        </section>
        <aside className="generate-aside">
          <div className="panel summary-panel">
            <span className="eyebrow">СЕНІҢ ЖАЗУ БАҒЫТЫҢ</span>
            <div className="summary-icon">
              <FeatherIcon />
            </div>
            <h3>{params.title || 'Әр ой — жаңа мүмкіндік'}</h3>
            <Ornament />
            <dl>
              <div>
                <dt>Эссе түрі</dt>
                <dd>{params.essayType}</dd>
              </div>
              <div>
                <dt>Стиль</dt>
                <dd>{params.style}</dd>
              </div>
              <div>
                <dt>Көлем</dt>
                <dd>≈ {params.targetWordCount} сөз</dd>
              </div>
              <div>
                <dt>Аудитория</dt>
                <dd>{params.audience}</dd>
              </div>
              <div>
                <dt>Дәлелдер</dt>
                <dd>{params.argumentsCount}</dd>
              </div>
            </dl>
            <div className="summary-options">
              {params.includeCounterargument && (
                <span>
                  <Check size={13} />
                  Қарсы пікір
                </span>
              )}
              {params.includeSources && (
                <span>
                  <Check size={13} />
                  Дереккөздер
                </span>
              )}
            </div>
          </div>
          <div className="writing-tip">
            <span>✦ КІШКЕНТАЙ КЕҢЕС</span>
            <h3>Ойыңды бір сөйлеммен айт.</h3>
            <p>
              Нақты тезис эссеге бағыт береді. Өзіңе «Мен нені дәлелдегім келеді?» деген сұрақ қой.
            </p>
          </div>
          <div className="privacy-note">
            <ShieldCheck size={20} />
            <p>
              Жұмыстарың жеке аккаунтыңда сақталады. Gemini қосылғанда енгізілген параметрлер Google
              қызметіне жіберіледі.
            </p>
          </div>
          {!user && (
            <p className="aside-login">
              Аккаунтың бар ма?{' '}
              <Link to="/login?next=/generate">
                Кіру <ArrowRight size={13} />
              </Link>
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
function FeatherIcon() {
  return <FileText size={32} strokeWidth={1} />;
}
