import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FEATURES = [
  {
    icon: '⚡',
    title: 'Real-time collaboration',
    desc: 'Work together live with cursor tracking, presence indicators, and conflict-free editing powered by Yjs.',
    accent: '#6c3fff',
    bg: '#0d0a1f',
    border: '#2a1f5e',
  },
  {
    icon: '✦',
    title: 'AI-powered assistant',
    desc: 'Get instant suggestions, summaries, explanations, and autocomplete — all inside your document.',
    accent: '#06b6d4',
    bg: '#041519',
    border: '#0c3d45',
  },
  {
    icon: '◈',
    title: 'Rich & code editors',
    desc: 'Toggle between a full rich-text editor with formatting tools and a code editor with syntax support.',
    accent: '#ec4899',
    bg: '#150d1f',
    border: '#4a1960',
  },
  {
    icon: '🔁',
    title: 'Version history',
    desc: 'Every change is tracked. Restore any previous snapshot of your document with one click.',
    accent: '#84cc16',
    bg: '#0f1208',
    border: '#2a3a08',
  },
  {
    icon: '◎',
    title: 'Workspaces & roles',
    desc: 'Organise work into workspaces. Assign admin, editor, and viewer roles to control access.',
    accent: '#f59e0b',
    bg: '#120c08',
    border: '#3a2800',
  },
  {
    icon: '▦',
    title: 'Tasks & members',
    desc: 'Track tasks, assign them to team members, and monitor progress — all without leaving the platform.',
    accent: '#818cf8',
    bg: '#0a0a1f',
    border: '#1e1e4a',
  },
];

const STATS = [
  { value: '10x', label: 'Faster collaboration' },
  { value: '99%', label: 'Uptime guaranteed' },
  { value: '∞', label: 'Version history' },
  { value: 'AI', label: 'Built-in assistant' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Create a workspace', desc: 'Set up a workspace for your team or project in seconds.' },
  { step: '02', title: 'Invite your team', desc: 'Add members and assign roles — admin, editor, or viewer.' },
  { step: '03', title: 'Start collaborating', desc: 'Open any document and watch everyone\'s cursor in real time.' },
  { step: '04', title: 'Let AI help', desc: 'Select text and ask the AI to improve, explain, or summarise it.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState({});
  const featuresRef = useRef(null);
  const howRef = useRef(null);
  const statsRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setVisible((p) => ({ ...p, [e.target.dataset.id]: true }));
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll('[data-id]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const fadeIn = (id, delay = 0) => ({
    opacity: visible[id] ? 1 : 0,
    transform: visible[id] ? 'translateY(0)' : 'translateY(32px)',
    transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
  });

  return (
    <div style={{ background: '#07080f', color: '#c9d1d9', fontFamily: "'Segoe UI', sans-serif", minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── Navbar ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 40px', height: 60, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        background: scrolled ? 'rgba(7,8,15,0.92)' : 'transparent',
        borderBottom: scrolled ? '1px solid #1a1b2e' : '1px solid transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        transition: 'all 0.3s ease',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: '#6c3fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff' }}>⚡</div>
          <span style={{ fontWeight: 800, fontSize: 17, color: '#f0f0ff', letterSpacing: '-0.4px' }}>CollabLearn</span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {['Features', 'How it works', 'Pricing'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} style={{ fontSize: 13, color: '#6060a0', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#f0f0ff'}
              onMouseLeave={e => e.target.style.color = '#6060a0'}
            >{l}</a>
          ))}
        </div>

        {/* Auth buttons */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => navigate('/login')}
            style={{ padding: '8px 18px', borderRadius: 9, border: '1px solid #1e1e38', background: 'transparent', color: '#a78bfa', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.target.style.background = '#12122a'; e.target.style.borderColor = '#6c3fff'; }}
            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = '#1e1e38'; }}
          >
            Log in
          </button>
          <button
            onClick={() => navigate('/register')}
            style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: '#6c3fff', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => e.target.style.background = '#7c4fff'}
            onMouseLeave={e => e.target.style.background = '#6c3fff'}
          >
            Get started free
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        {/* Background glow blobs */}
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: '#6c3fff', opacity: 0.06, top: '10%', left: '50%', transform: 'translateX(-50%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: '#06b6d4', opacity: 0.05, top: '30%', left: '20%', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: '#ec4899', opacity: 0.05, top: '30%', right: '20%', filter: 'blur(60px)', pointerEvents: 'none' }} />

        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#1a0f3d', border: '1px solid #2a1f5e', borderRadius: 20, padding: '6px 14px', marginBottom: 28, animation: 'fadeDown 0.6s ease both' }}>
          <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 700 }}>✦ Now with Gemini AI</span>
          <span style={{ fontSize: 11, color: '#3d3d5c' }}>→</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(38px, 7vw, 80px)', fontWeight: 800, lineHeight: 1.08,
          letterSpacing: '-2px', color: '#f0f0ff', margin: '0 0 24px',
          maxWidth: 900, animation: 'fadeDown 0.6s ease 0.1s both',
        }}>
          Where teams learn<br />
          <span style={{ color: '#6c3fff' }}>and build</span> together
        </h1>

        {/* Subheadline */}
        <p style={{ fontSize: 18, color: '#6060a0', maxWidth: 560, lineHeight: 1.7, margin: '0 0 40px', animation: 'fadeDown 0.6s ease 0.2s both' }}>
          Real-time collaborative documents, an AI writing assistant, version history, and task management — all in one platform built for modern teams.
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', animation: 'fadeDown 0.6s ease 0.3s both' }}>
          <button
            onClick={() => navigate('/register')}
            style={{ padding: '14px 32px', borderRadius: 12, border: 'none', background: '#6c3fff', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.target.style.background = '#7c4fff'; e.target.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.target.style.background = '#6c3fff'; e.target.style.transform = 'translateY(0)'; }}
          >
            Start for free →
          </button>
          <button
            onClick={() => navigate('/login')}
            style={{ padding: '14px 32px', borderRadius: 12, border: '1px solid #1e1e38', background: 'transparent', color: '#a78bfa', fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.target.style.background = '#12122a'; e.target.style.borderColor = '#6c3fff'; }}
            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = '#1e1e38'; }}
          >
            Sign in to workspace
          </button>
        </div>

        {/* Hero preview card */}
        <div style={{ marginTop: 64, width: '100%', maxWidth: 860, animation: 'fadeDown 0.7s ease 0.4s both' }}>
          <div style={{ background: '#0b0c18', border: '1px solid #1a1b2e', borderRadius: 16, overflow: 'hidden' }}>
            {/* Fake browser bar */}
            <div style={{ background: '#0f0f1e', borderBottom: '1px solid #1a1b2e', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ec4899' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#84cc16' }} />
              <div style={{ flex: 1, background: '#1a1b2e', borderRadius: 6, height: 22, marginLeft: 8, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
                <span style={{ fontSize: 11, color: '#3d3d5c' }}>collablearn.app/editor/api-design-spec</span>
              </div>
            </div>
            {/* Fake editor UI */}
            <div style={{ padding: '20px 24px', textAlign: 'left' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {['B', 'I', 'U', 'H1', 'H2', '• List', '</>', '✦ AI'].map((t, i) => (
                  <div key={i} style={{ padding: '4px 10px', borderRadius: 6, background: t === '✦ AI' ? '#1a0f3d' : '#12122a', border: `1px solid ${t === '✦ AI' ? '#2a1f5e' : '#1e1e38'}`, color: t === '✦ AI' ? '#a78bfa' : '#3d3d5c', fontSize: 11, fontWeight: 600 }}>{t}</div>
                ))}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: -4 }}>
                  {['#6c3fff', '#06b6d4', '#ec4899'].map((c, i) => (
                    <div key={i} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: '2px solid #0b0c18', marginLeft: i > 0 ? -6 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: '#fff' }}>JK</div>
                  ))}
                  <span style={{ fontSize: 11, color: '#3d3d5c', marginLeft: 8, lineHeight: '22px' }}>3 editing</span>
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f0ff', marginBottom: 12 }}>API Design Specification</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['This document outlines the REST API design for CollabLearn v2...', 'Authentication follows JWT with 15-minute access tokens and...', ''].map((line, i) => (
                  <div key={i} style={{ height: i === 2 ? 14 : 16, background: i === 2 ? '#12122a' : '#1a1b2e', borderRadius: 4, width: i === 0 ? '90%' : i === 1 ? '75%' : '40%' }} />
                ))}
              </div>
              {/* AI panel peek */}
              <div style={{ marginTop: 16, background: '#0d0a1f', border: '1px solid #2a1f5e', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: '#6c3fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>✦</div>
                <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600 }}>AI suggestion:</span>
                <span style={{ fontSize: 12, color: '#6060a0' }}>Consider adding rate limiting details to the auth section…</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section id="pricing" style={{ padding: '60px 40px', borderTop: '1px solid #1a1b2e', borderBottom: '1px solid #1a1b2e' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}
          data-id="stats" ref={statsRef}
        >
          {STATS.map((s, i) => (
            <div key={s.label} data-id={`stat-${i}`} style={{
              textAlign: 'center', padding: '20px',
              borderRight: i < 3 ? '1px solid #1a1b2e' : 'none',
              ...fadeIn(`stat-${i}`, i * 0.1),
            }}>
              <div style={{ fontSize: 42, fontWeight: 800, color: '#f0f0ff', letterSpacing: '-2px', marginBottom: 6 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#3d3d5c', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: '100px 40px' }} ref={featuresRef}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div data-id="feat-header" style={{ textAlign: 'center', marginBottom: 64, ...fadeIn('feat-header') }}>
            <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#6c3fff', background: '#1a0f3d', border: '1px solid #2a1f5e', borderRadius: 20, padding: '4px 14px', marginBottom: 16, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Features</div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, color: '#f0f0ff', letterSpacing: '-1px', margin: '0 0 16px' }}>
              Everything your team needs
            </h2>
            <p style={{ fontSize: 16, color: '#6060a0', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
              Built for students, educators, and professional teams who want to think and build together.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                data-id={`feat-${i}`}
                style={{
                  background: f.bg, border: `1px solid ${f.border}`, borderRadius: 16,
                  padding: '28px', position: 'relative', overflow: 'hidden',
                  transition: 'transform 0.2s, border-color 0.2s',
                  cursor: 'default',
                  ...fadeIn(`feat-${i}`, i * 0.08),
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = f.accent + '88'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = f.border; }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: f.accent, borderRadius: '16px 16px 0 0' }} />
                <div style={{ width: 42, height: 42, borderRadius: 11, background: `${f.accent}22`, border: `1px solid ${f.accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 18 }}>
                  {f.icon}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f0ff', marginBottom: 10, letterSpacing: '-0.3px' }}>{f.title}</div>
                <div style={{ fontSize: 13, color: '#6060a0', lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" style={{ padding: '100px 40px', background: '#0b0c18', borderTop: '1px solid #1a1b2e', borderBottom: '1px solid #1a1b2e' }} ref={howRef}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div data-id="how-header" style={{ textAlign: 'center', marginBottom: 64, ...fadeIn('how-header') }}>
            <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#06b6d4', background: '#041a20', border: '1px solid #0c3d45', borderRadius: 20, padding: '4px 14px', marginBottom: 16, letterSpacing: '0.1em', textTransform: 'uppercase' }}>How it works</div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, color: '#f0f0ff', letterSpacing: '-1px', margin: '0 0 16px' }}>
              Up and running in minutes
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={step.step}
                data-id={`step-${i}`}
                style={{
                  display: 'flex', gap: 32, alignItems: 'flex-start',
                  padding: '32px 0',
                  borderBottom: i < HOW_IT_WORKS.length - 1 ? '1px solid #1a1b2e' : 'none',
                  ...fadeIn(`step-${i}`, i * 0.1),
                }}
              >
                <div style={{ fontSize: 48, fontWeight: 800, color: '#1a1b2e', letterSpacing: '-2px', minWidth: 80, lineHeight: 1 }}>{step.step}</div>
                <div style={{ flex: 1, paddingTop: 6 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#f0f0ff', marginBottom: 8, letterSpacing: '-0.3px' }}>{step.title}</div>
                  <div style={{ fontSize: 14, color: '#6060a0', lineHeight: 1.7 }}>{step.desc}</div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: ['#1a0f3d', '#041a20', '#150d1f', '#0f1208'][i], border: `1px solid ${['#6c3fff', '#06b6d4', '#ec4899', '#84cc16'][i]}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, marginTop: 4 }}>
                  {['⚡', '👥', '✏️', '✦'][i]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section style={{ padding: '100px 40px', textAlign: 'center' }}>
        <div data-id="cta" style={{ maxWidth: 640, margin: '0 auto', ...fadeIn('cta') }}>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 56px)', fontWeight: 800, color: '#f0f0ff', letterSpacing: '-1.5px', margin: '0 0 20px', lineHeight: 1.1 }}>
            Ready to build<br /><span style={{ color: '#6c3fff' }}>together?</span>
          </h2>
          <p style={{ fontSize: 16, color: '#6060a0', marginBottom: 36, lineHeight: 1.7 }}>
            Join teams already collaborating on CollabLearn. Free to start, no credit card required.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/register')}
              style={{ padding: '14px 36px', borderRadius: 12, border: 'none', background: '#6c3fff', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.target.style.background = '#7c4fff'; e.target.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.target.style.background = '#6c3fff'; e.target.style.transform = 'translateY(0)'; }}
            >
              Create free account →
            </button>
            <button
              onClick={() => navigate('/login')}
              style={{ padding: '14px 36px', borderRadius: 12, border: '1px solid #1e1e38', background: 'transparent', color: '#a78bfa', fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.target.style.background = '#12122a'; }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; }}
            >
              Sign in
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid #1a1b2e', padding: '32px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: '#6c3fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff' }}>⚡</div>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#f0f0ff' }}>CollabLearn</span>
        </div>
        <span style={{ fontSize: 12, color: '#3d3d5c' }}>© 2026 CollabLearn. Built for the Clashers team.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Privacy', 'Terms', 'Contact'].map(l => (
            <a key={l} href="#" style={{ fontSize: 12, color: '#3d3d5c', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#a78bfa'}
              onMouseLeave={e => e.target.style.color = '#3d3d5c'}
            >{l}</a>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #07080f; }
        ::-webkit-scrollbar-thumb { background: #1a1b2e; border-radius: 3px; }
      `}</style>
    </div>
  );
}
