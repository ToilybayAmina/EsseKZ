import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileText,
  LoaderCircle,
  RefreshCw,
  Save,
} from 'lucide-react';
import { countWords, essayParameters, type Essay } from '../../shared/schema';
import { splitParagraphs } from '../../shared/essay-format';
import { api } from '../api';
import { useApp } from '../context';
import { ErrorBox, Loading, Ornament } from '../components';
export function Result() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify, health } = useApp();
  const [essay, setEssay] = useState<Essay | null>(null);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const editor = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState('');
  const [copied, setCopied] = useState(false);
  const dirty = Boolean(essay && (title !== essay.title || text !== essay.essay_text));
  useLayoutEffect(() => {
    function resize() {
      if (!editor.current) return;
      editor.current.style.height = 'auto';
      editor.current.style.height = `${editor.current.scrollHeight}px`;
    }
    resize();
    window.addEventListener('resize', resize);
    document.fonts.ready.then(resize);
    return () => window.removeEventListener('resize', resize);
  }, [text, loading]);
  useEffect(() => {
    let live = true;
    setLoading(true);
    api<{ essay: Essay }>(`/essays/${id}`)
      .then((r) => {
        if (live) {
          setEssay(r.essay);
          setTitle(r.essay.title);
          setText(r.essay.essay_text);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [id]);
  useEffect(() => {
    function warn(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function save() {
    setBusy(true);
    setError('');
    try {
      const r = await api<{ essay: Essay }>(`/essays/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ title, essayText: text }),
      });
      setEssay(r.essay);
      setTitle(r.essay.title);
      setText(r.essay.essay_text);
      notify('Өзгерістер сақталды.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${title}\n\n${text}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setError('Көшіру мүмкін болмады. Мәтінді белгілеп, қолмен көшіріңіз.');
    }
  }
  async function download(format: string) {
    setDownloading(format);
    setError('');
    try {
      const response = await fetch(`/api/essays/${id}/export/${format}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Жүктеу мүмкін болмады.');
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `EsseKZ-${id}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDownloading('');
    }
  }
  if (loading)
    return (
      <div className="container page-container">
        <Loading />
      </div>
    );
  if (!essay)
    return (
      <div className="container page-container">
        <ErrorBox>{error || 'Эссе табылмады.'}</ErrorBox>
        <Link to="/history" className="button outline">
          Тарихқа оралу
        </Link>
      </div>
    );
  return (
    <div className="container page-container">
      <div className="result-top">
        <Link className="back-link" to="/history">
          <ArrowLeft size={16} />
          Жұмыстарым
        </Link>
        <span className="result-save-status">
          {dirty ? (
            <>
              <span className="unsaved-dot" />
              Сақталмаған өзгерістер
            </>
          ) : (
            <>
              <Check size={15} />
              Барлық өзгерістер сақталған
            </>
          )}
        </span>
      </div>
      <div className="result-layout">
        <section className="panel document-panel">
          <div className="document-meta">
            <span className="eyebrow">
              {essay.source === 'gemini' ? 'GEMINI ЖАЗҒАН НҰСҚА' : 'ӨЗІМ ЖАЗҒАН МӘТІН'}
            </span>
            <span>{new Date(essay.created_at).toLocaleDateString('kk-KZ')}</span>
          </div>
          <label className="sr-only" htmlFor="result-title">
            Эссе тақырыбы
          </label>
          <input
            id="result-title"
            className="document-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minLength={3}
            maxLength={200}
          />
          <Ornament />
          <label className="sr-only" htmlFor="result-text">
            Эссе мәтіні
          </label>
          <textarea
            ref={editor}
            id="result-text"
            className="document-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={30000}
            spellCheck={false}
          />
          <div className="document-bottom">
            <span>
              <FileText size={15} />
              {countWords(text)} сөз
            </span>
            <span>{splitParagraphs(text).length} абзац</span>
            <span>{text.length} таңба</span>
            <span>Мәтінді осы жерде өңдей аласыз</span>
          </div>
        </section>
        <aside className="result-aside">
          <div className="panel">
            <h2>Соңғы штрихтар</h2>
            <p>Мәтініңді өңдеп, өз ойыңмен толықтыр.</p>
            <button
              className="button gold full-width"
              disabled={!dirty || busy || !text.trim() || title.trim().length < 3}
              onClick={save}
            >
              {busy ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}Өзгерістерді
              сақтау
            </button>
            <button className="button outline full-width" onClick={copy}>
              {copied ? <Check size={17} /> : <Copy size={17} />}{' '}
              {copied ? 'Көшірілді' : 'Мәтінді көшіру'}
            </button>
            <div className="form-divider" />
            <h3>Өзіңмен бірге ала кет</h3>
            <p className="field-help">
              {dirty ? 'Жүктеу үшін өзгерістерді сақтаңыз.' : 'Қажетті форматты таңдаңыз.'}
            </p>
            <div className="export-buttons">
              {['pdf', 'docx', 'txt'].map((f) => (
                <button
                  key={f}
                  disabled={dirty || Boolean(downloading)}
                  onClick={() => download(f)}
                >
                  {downloading === f ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <Download size={17} />
                  )}
                  <span>{f === 'docx' ? 'Word' : f.toUpperCase()}</span>
                </button>
              ))}
            </div>
            <div className="form-divider" />
            <dl className="result-params">
              <div>
                <dt>Эссе түрі</dt>
                <dd>{essay.essay_type}</dd>
              </div>
              <div>
                <dt>Стиль</dt>
                <dd>{essay.style}</dd>
              </div>
              <div>
                <dt>Аудитория</dt>
                <dd>{essay.audience}</dd>
              </div>
              <div>
                <dt>Дәлелдер саны</dt>
                <dd>{essay.arguments_count}</dd>
              </div>
              <div>
                <dt>Мақсатты көлем</dt>
                <dd>{essay.target_word_count} сөз</dd>
              </div>
            </dl>
            <button
              className="text-button rewrite"
              disabled={dirty}
              onClick={() =>
                navigate('/generate', { state: { parameters: essayParameters(essay) } })
              }
            >
              <RefreshCw size={15} />
              {health?.aiConfigured ? 'Қайта жазу параметрлері' : 'Осы параметрлермен жазу'}
            </button>
          </div>
          <div className="writing-tip">
            <span>✦ ЕСТЕ САҚТА</span>
            <p>
              Дереккөздер мен дәйексөздерді тексер. Мәтінге өз дауысыңды қос. Академиялық адалдық
              ережелерін сақта.
            </p>
          </div>
        </aside>
      </div>
      {error && <ErrorBox>{error}</ErrorBox>}
    </div>
  );
}
