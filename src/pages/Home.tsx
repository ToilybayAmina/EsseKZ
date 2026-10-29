import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Sparkles,
  Feather,
  Check,
  ChevronDown,
  Quote,
  ShieldCheck,
  MoveRight,
} from 'lucide-react';
import { Ornament } from '../components';
import { defaults } from '../../shared/schema';
export const faqs = [
  [
    'EsseKZ қалай жұмыс істейді?',
    'Тақырып пен негізгі ойды енгізіп, эссе түрін, стилін және көлемін таңдаңыз. Gemini қосылған кезде эссе осы параметрлермен жазылып, жеке тарихыңызға сақталады. Әзірге өз мәтініңізді жазып, редакторда сақтай аласыз.',
  ],
  [
    'Эссе тек қазақ тілінде жазыла ма?',
    'Иә. EsseKZ қазақ тіліндегі эссеге арналған. Генерация қосылғанда сервер қазақ әріптерінің болуын, мәтін көлемін және бөлім тақырыпшаларының жоқтығын тексереді.',
  ],
  [
    'Жұмысымды Word немесе PDF ретінде жүктей аламын ба?',
    'Иә. Сақталған эссені нәтижелер бетінен PDF, DOCX және TXT форматтарында жүктеуге болады. Алдымен соңғы өзгерістерді сақтаңыз.',
  ],
  [
    'AI жазған мәтінді бірден тапсыруға бола ма?',
    'Мәтін — жазу дағдысын дамытуға арналған көмекші үлгі. Деректерді өзіңіз тексеріп, ойыңызбен толықтырыңыз және оқу орныңыздың академиялық адалдық ережелерін сақтаңыз.',
  ],
];
export function FAQList() {
  return (
    <div className="faq-list">
      {faqs.map(([q, a]) => (
        <details key={q}>
          <summary>
            {q}
            <ChevronDown size={18} />
          </summary>
          <p>{a}</p>
        </details>
      ))}
    </div>
  );
}
export function Home() {
  const [topic, setTopic] = useState('');
  const navigate = useNavigate();
  function quickStart(e: React.FormEvent) {
    e.preventDefault();
    try {
      sessionStorage.setItem('essekz-parameters', JSON.stringify({ ...defaults, title: topic }));
    } catch {}
    navigate('/generate');
  }
  return (
    <>
      <section className="hero-wrap">
        <div className="container hero">
          <div className="hero-copy">
            <div className="hero-label">
              <span />
              ҚАЗАҚ ТІЛІНДЕГІ ЖАЗУ КӨМЕКШІСІ
            </div>
            <h1>
              Ойың — қазына.
              <br />
              Сөзің — <span>қанат.</span>
            </h1>
            <p>
              Қазақ тілінде эссе жазуға арналған интеллектуалды кеңістік. Ойыңды жүйелеп, әр сөзіңе
              мән бер.
            </p>
            <div className="hero-buttons">
              <Link to="/generate" className="button gold">
                Эссе жазуды бастау <ArrowUpRight size={19} />
              </Link>
              <a className="text-button" href="#how-it-works">
                Қалай жұмыс істейді? <ArrowRight size={17} />
              </a>
            </div>
            <div className="hero-bottom">
              <span className="little-icon">
                <Feather size={17} />
              </span>
              <span>Ана тіліңде. Өз мәнеріңмен.</span>
              <div className="small-divider" />
              <span>Жаңа ойға жол аш</span>
            </div>
          </div>
          <div className="hero-art">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="hero-star star-one">✦</div>
            <div className="hero-star star-two">✧</div>
            <div className="hero-seal">
              <img src="/logo.svg" alt="Қазақы оюмен көмкерілген алтын қаламұш пен қанат" />
            </div>
            <div className="floating-note">
              <span>✦</span> Әр сөзде — өзіңнің ізің.
            </div>
          </div>
          <div className="hero-corner" aria-hidden="true">
            ❧
          </div>
        </div>
      </section>
      <section className="container quick-start">
        <div className="quick-label">
          <Sparkles size={19} />
          <div>
            <strong>Бәрі бір ойдан басталады</strong>
            <small>Бүгін не туралы жазғың келеді?</small>
          </div>
        </div>
        <form onSubmit={quickStart}>
          <input
            aria-label="Жылдам бастау тақырыбы"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            maxLength={200}
            placeholder="Мысалы: Білім — болашақтың кілті"
          />
          <button className="button gold" type="submit">
            Бастау <ArrowRight size={17} />
          </button>
        </form>
      </section>
      <section className="container section features-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">ЖАЗУ ӨНЕРІНЕ ЖАҢА КӨЗҚАРАС</div>
            <h2>Ойыңды жеткізу оңайырақ.</h2>
          </div>
          <p>
            Алғашқы идеядан соңғы нүктеге дейін.
            <br />
            Жазуға қажет құралдар — бір кеңістікте.
          </p>
        </div>
        <div className="feature-grid">
          {[
            {
              icon: <GraduationCap />,
              no: '01',
              title: 'Өз стиліңді таңда',
              text: 'Академиялықтан көркемге дейін. Эссеңнің стилі мен аудиториясын өзің анықта.',
              tag: '6 стиль · 12 эссе түрі',
            },
            {
              icon: <BookOpen />,
              no: '02',
              title: 'Ойға нақты құрылым',
              text: 'Тезис, дәлел мен қарсы пікір. Мәтіннің әр бөлігі бір ойға қызмет етсін.',
              tag: 'Параметрлер өз қолыңда',
            },
            {
              icon: <Feather />,
              no: '03',
              title: 'Шабытыңды сақта',
              text: 'Мәтінді өңде, жеке тарихқа сақта және өзіңе ыңғайлы форматта жүкте.',
              tag: 'PDF · Word · TXT',
            },
          ].map((f) => (
            <article className="feature-card" key={f.no}>
              <div className="feature-top">
                <span className="feature-icon">{f.icon}</span>
                <span className="feature-number">{f.no}</span>
              </div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
              <div className="feature-tag">
                <span />
                {f.tag}
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="about-band">
        <div className="container about-grid">
          <div className="about-image">
            <img
              src="/books.svg"
              alt="Қазақ әдебиеті, Сөз өнері және Ой мен тіл кітаптарының иллюстрациясы"
            />
            <span className="image-caption">
              <BookOpen size={15} /> Тіл — ұлттың жаны
            </span>
          </div>
          <div className="about-copy">
            <div className="eyebrow">ТІЛГЕ ҚҰРМЕТ. ОЙҒА ЕРКІНДІК.</div>
            <h2>
              Қазақша ойлау.
              <br />
              <span className="serif-accent">Әдемі жеткізу.</span>
            </h2>
            <p>
              EsseKZ — қазақ тілінде жазуды жеңілдетуге арналған жоба. Біз технология мен ана
              тіліміздің байлығын бір кеңістікке біріктіреміз.
            </p>
            <ul className="check-list">
              <li>
                <Check />
                Өз ойың мен негізгі тезисіңе сүйенеді
              </li>
              <li>
                <Check />
                Мәтінді еркін өңдеуге мүмкіндік береді
              </li>
              <li>
                <Check />
                Жеке жұмыстарыңды бір жерде сақтайды
              </li>
            </ul>
            <Link to="/about" className="text-button">
              Жобамен танысу <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
      <section className="container section" id="how-it-works">
        <div className="center-heading">
          <div className="eyebrow">ҮШ ҚАДАМ. БІР ЖАҢА МӘТІН.</div>
          <h2>Жазу жолың осыдан басталады</h2>
          <Ornament />
        </div>
        <div className="steps-grid">
          {[
            ['01', 'Ойыңды бөліс', 'Тақырып пен негізгі тезисті жаз. Айтқың келген ойды анықта.'],
            ['02', 'Бағытыңды таңда', 'Стиль, сөз саны, аудитория және дәлелдер санын белгіле.'],
            ['03', 'Мәтініңді жетілдір', 'Нұсқаны өңдеп, өз дауысыңды қос. Сақта және жүктеп ал.'],
          ].map(([n, title, text]) => (
            <article key={n}>
              <span className="step-number">{n}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="container writing-quote">
        <Quote size={32} strokeWidth={1} />
        <p>
          Жақсы мәтін дайын жауаптан емес,
          <br />
          <em>өзіңе қойған жақсы сұрақтан басталады.</em>
        </p>
        <span>ӘР СӨЙЛЕМДЕ — ЖАҢА МҮМКІНДІК</span>
        <Ornament />
      </section>
      <section className="container section faq-section">
        <div>
          <div className="eyebrow">БІЛГІҢ КЕЛЕТІНІ</div>
          <h2>Сұрағың бар ма?</h2>
          <p>
            Алғашқы қадамға көмектесетін
            <br />
            қысқа жауаптар.
          </p>
          <Link to="/faq" className="text-button">
            Барлық сұрақтар <MoveRight size={18} />
          </Link>
        </div>
        <FAQList />
      </section>
      <section className="container cta">
        <div>
          <div className="eyebrow">АЛҒАШҚЫ СӨЙЛЕМДІ БІРГЕ ЖАЗАЙЫҚ</div>
          <h2>Сенің ойың оқылуға лайық.</h2>
          <p>Жаңа парақ аш. Жаңа ойға қанат бер.</p>
        </div>
        <Link to="/generate" className="button gold">
          Эссе жазу <ArrowUpRight size={20} />
        </Link>
        <span className="cta-decoration" aria-hidden="true">
          ❧
        </span>
      </section>
    </>
  );
}
