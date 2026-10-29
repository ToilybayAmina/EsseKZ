import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUpRight,
  CalendarDays,
  FileText,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { Essay } from '../../shared/schema';
import { essayTypes } from '../../shared/schema';
import { api } from '../api';
import { Empty, ErrorBox, Loading, PageHeading } from '../components';
import { useApp } from '../context';
export function History() {
  const [essays, setEssays] = useState<Essay[]>([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [deleting, setDeleting] = useState<Essay | null>(null);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const { notify } = useApp();
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    const timer = setTimeout(
      () =>
        api<{ essays: Essay[]; hasMore: boolean }>(
          `/essays?${new URLSearchParams({ search, type, offset: String(offset) })}`,
        )
          .then((r) => {
            if (live) {
              setEssays((prev) => (offset ? [...prev, ...r.essays] : r.essays));
              setHasMore(r.hasMore);
            }
          })
          .catch((e) => {
            if (live) setError(e.message);
          })
          .finally(() => {
            if (live) setLoading(false);
          }),
      250,
    );
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [search, type, offset, refresh]);
  useEffect(() => {
    if (deleting) dialog.current?.showModal();
    else dialog.current?.close();
  }, [deleting]);
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/essays/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      setOffset(0);
      setRefresh((v) => v + 1);
      notify('Эссе жойылды.');
    } catch (e) {
      setError((e as Error).message);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page-container history-page">
      <div className="heading-with-action">
        <PageHeading
          eyebrow="ЖЕКЕ КІТАПХАНАҢ"
          title="Ойларың осында сақталады."
          text="Кеше жазғаныңды жалғастыр. Бүгінгі ойыңа қайта орал."
        />
        <Link to="/generate" className="button gold">
          <Plus size={18} />
          Жаңа эссе
        </Link>
      </div>
      <div className="history-toolbar">
        <div className="search-input">
          <Search size={18} />
          <input
            aria-label="Эсселерді іздеу"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            placeholder="Тақырып немесе мәтін бойынша іздеу"
          />
        </div>
        <select
          aria-label="Эссе түрі бойынша сүзгі"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setOffset(0);
          }}
        >
          <option value="">Барлық эссе түрі</option>
          {essayTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      {error && (
        <ErrorBox>
          {error}
          <button className="text-button" onClick={() => setRefresh((v) => v + 1)}>
            Қайта көру
          </button>
        </ErrorBox>
      )}
      {loading && offset === 0 ? (
        <Loading />
      ) : essays.length ? (
        <>
          <div className="history-grid">
            {essays.map((e) => (
              <article className="panel essay-card" key={e.id}>
                <div className="essay-card-top">
                  <span className="essay-type">
                    <FileText size={14} />
                    {e.essay_type}
                  </span>
                  <button
                    className="icon-button delete-button"
                    onClick={() => setDeleting(e)}
                    aria-label={`${e.title} эссесін жою`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <Link to={`/result/${e.id}`}>
                  <h2>{e.title}</h2>
                  <p>
                    {e.essay_text.slice(0, 180)}
                    {e.essay_text.length > 180 ? '…' : ''}
                  </p>
                </Link>
                <div className="essay-tags">
                  <span>{e.word_count} сөз</span>
                  <span>{e.style}</span>
                  <span>{e.source === 'manual' ? 'Өз мәтінім' : 'Gemini'}</span>
                </div>
                <div className="essay-card-bottom">
                  <span>
                    <CalendarDays size={13} />
                    {new Date(e.created_at).toLocaleDateString('kk-KZ')}
                  </span>
                  <Link to={`/result/${e.id}`}>
                    Ашу <ArrowUpRight size={17} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {hasMore && (
            <button
              disabled={loading}
              className="button outline load-more"
              onClick={() => setOffset((v) => v + 20)}
            >
              {loading ? 'Жүктелуде…' : 'Тағы көрсету'}
              <ArrowDown size={16} />
            </button>
          )}
        </>
      ) : (
        !error && (
          <div className="panel">
            <Empty
              title={search || type ? 'Сәйкес эссе табылмады' : 'Жаңа парақтан бастайық'}
              text={
                search || type
                  ? 'Іздеу сөзін не сүзгіні өзгертіп көріңіз.'
                  : 'Сақталған эсселерің осы жерде көрінеді. Алғашқы ойыңды жазып көр.'
              }
              action={
                <Link to="/generate" className="button gold">
                  Алғашқы эссемді жазу <ArrowUpRight size={18} />
                </Link>
              }
            />
          </div>
        )
      )}
      <dialog ref={dialog} className="confirm-dialog" onCancel={() => setDeleting(null)}>
        <button
          className="dialog-close icon-button"
          onClick={() => setDeleting(null)}
          aria-label="Жабу"
        >
          <X size={19} />
        </button>
        <div className="empty-feather">
          <Trash2 size={28} />
        </div>
        <h2>Эссені жоямыз ба?</h2>
        <p>«{deleting?.title}» біржола жойылады. Бұл әрекетті қайтару мүмкін емес.</p>
        <div className="dialog-actions">
          <button className="button outline" disabled={busy} onClick={() => setDeleting(null)}>
            Бас тарту
          </button>
          <button className="button danger" disabled={busy} onClick={remove}>
            {busy ? 'Жойылуда…' : 'Жою'}
          </button>
        </div>
      </dialog>
    </div>
  );
}
