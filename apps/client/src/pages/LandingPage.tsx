import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DriftingBlobs } from '../components/layout/PageGlow'
import { useDialogFocus } from '../hooks/useDialogFocus'

interface FeatureCard {
  title: string
  description: string
  iconBg: string
  icon: ReactNode
}

const FEATURES: FeatureCard[] = [
  {
    title: 'Behavioral Interviews',
    description:
      'Practice storytelling with the STAR method for leadership, teamwork, and conflict questions.',
    iconBg: 'bg-violet-500/14',
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-violet-400"
      >
        <path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.9 8.9 0 0 1-3.6-.8L3 20l1-4.5a8.4 8.4 0 0 1-1-4A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
      </svg>
    ),
  },
  {
    title: 'Technical Interviews',
    description:
      'Solve coding and CS fundamentals questions with an interviewer that adapts to your answers.',
    iconBg: 'bg-cyan-400/14',
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#5CD9F1"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    title: 'System Design',
    description:
      'Whiteboard-style architecture rounds that probe trade-offs, scale, and reliability.',
    iconBg: 'bg-purple-500/14',
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#C186F5"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
  {
    title: 'HR Interviews',
    description:
      'Culture-fit, compensation, and motivation conversations before you meet the real recruiter.',
    iconBg: 'bg-emerald-400/14',
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#4ADE9C"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="7" r="4" />
        <path d="M2.5 21c0-4 3-6.5 6.5-6.5s6.5 2.5 6.5 6.5" />
        <circle cx="17.5" cy="8" r="3" />
        <path d="M15 14.3c2.9.6 4.5 2.7 4.5 6.7" />
      </svg>
    ),
  },
]

const STEPS = [
  {
    number: '01',
    title: 'Create Profile',
    description:
      'Tell us your target role and experience level, then upload your resume so every question fits you.',
  },
  {
    number: '02',
    title: 'Start Voice Interview',
    description:
      'Talk it out loud with your AI interviewer, just like the real thing — no typing required.',
  },
  {
    number: '03',
    title: 'Receive AI Feedback',
    description:
      'Get a detailed breakdown of your communication, technical depth, and confidence in minutes.',
  },
]

interface WhyCard {
  title: string
  description: string
  icon: ReactNode
}

const WHY_CARDS: WhyCard[] = [
  {
    title: 'Dynamic AI Interviewer',
    description:
      'Follow-up questions adapt in real time to what you actually say, not a static script.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-violet-400"
      >
        <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
      </svg>
    ),
  },
  {
    title: 'Personalized Questions',
    description: 'Every session is generated around your target role and experience level.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#5CD9F1"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="0.7" fill="#5CD9F1" />
      </svg>
    ),
  },
  {
    title: 'Resume-aware Interviews',
    description:
      'Upload your resume and get asked about the projects and skills that are actually on it.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#C186F5"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="14" x2="15" y2="14" />
        <line x1="9" y1="17.5" x2="15" y2="17.5" />
      </svg>
    ),
  },
  {
    title: 'Detailed Feedback',
    description: 'Scoring across communication, technical depth, problem solving, and confidence.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-amber-400"
      >
        <line x1="4" y1="20" x2="4" y2="11" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="20" y1="20" x2="20" y2="15" />
      </svg>
    ),
  },
  {
    title: 'Voice Conversations',
    description:
      'Natural, low-latency voice practice — work on sounding confident, not just being right.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-rose-400"
      >
        <rect x="9" y="2" width="6" height="11" rx="3" />
        <path d="M5 10a7 7 0 0 0 14 0" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    title: 'Performance Analytics',
    description: 'Track your score trend across sessions and see exactly where to focus next.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#4ADE9C"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="3 17 9 11 13 15 21 5" />
        <polyline points="15 5 21 5 21 11" />
      </svg>
    ),
  },
]

function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center gap-[2.5px] rounded-[9px] bg-gradient-to-br from-violet-500 to-purple-500 shadow-[0_4px_14px_-2px_rgba(110,86,248,0.55)]"
      style={{ width: size, height: size }}
    >
      <span className="h-[9px] w-[3px] rounded-sm bg-white/85" />
      <span className="h-4 w-[3px] rounded-sm bg-white" />
      <span className="h-1.5 w-[3px] rounded-sm bg-white/85" />
    </span>
  )
}

function ArrowRightIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

/** No real demo video exists yet — this is a decorative placeholder panel
 * (matching the source mockup, which is equally just a play-button icon
 * with no video embed), not a broken feature. */
function DemoModal({ onClose }: { onClose: () => void }) {
  const closeButtonRef = useDialogFocus<HTMLButtonElement>(onClose)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-modal-title"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#050508]/75 p-10 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-190 overflow-hidden rounded-[20px] border border-white/10 bg-surface shadow-[0_40px_100px_-20px_rgba(0,0,0,0.7)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline px-5.5 py-4.5">
          <div id="demo-modal-title" className="font-display text-[15.5px] font-semibold text-ink">
            MentorQ product demo
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close demo"
            className="flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-white/6 text-[#c7c9d6] transition-colors hover:bg-white/12"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
        <div
          className="flex aspect-video items-center justify-center"
          style={{
            background: 'radial-gradient(circle at 50% 45%, rgba(110,86,248,0.22), #0B0C11 70%)',
          }}
        >
          <span className="flex h-16.5 w-16.5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-500 shadow-[0_12px_34px_-6px_rgba(110,86,248,0.6)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
              <polygon points="8 5 19 12 8 19" />
            </svg>
          </span>
        </div>
        <div className="px-5.5 py-4.5 text-[13.5px] text-[#8B8EA0]">
          A 90-second walkthrough of a live MentorQ voice interview session.
        </div>
      </div>
    </div>
  )
}

export function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false)

  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas font-sans text-ink">
      <DriftingBlobs variant="violet-cyan" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-375 left-[10%] h-150 w-150 rounded-full blur-[100px]"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.14), transparent 70%)' }}
      />

      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-100 flex h-19 items-center border-b border-hairline bg-canvas/65 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-320 items-center justify-between px-6 sm:px-10">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-lg font-bold tracking-tight text-ink">MentorQ</span>
          </Link>
          <div className="hidden items-center gap-9 md:flex">
            <a
              href="#features"
              className="text-[14.5px] font-medium text-[#C7C9D6] transition-colors hover:text-ink"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-[14.5px] font-medium text-[#C7C9D6] transition-colors hover:text-ink"
            >
              How it Works
            </a>
          </div>
          <div className="flex items-center gap-3.5">
            <Link
              to="/login"
              className="px-1.5 py-2.5 text-[14.5px] font-semibold text-[#EDEDF2] transition-colors hover:text-white"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-to-br from-violet-500 to-purple-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_6px_18px_-6px_rgba(110,86,248,0.55)] transition-[filter] hover:brightness-110"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-2 mx-auto grid max-w-320 grid-cols-1 items-center gap-12 px-6 pt-40 pb-24 sm:px-10 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:pt-46 lg:pb-32.5">
        <div>
          <div className="animate-fade-up mb-6.5 inline-flex items-center gap-2 rounded-full border border-violet-500/28 bg-violet-500/12 py-1.5 pr-3.5 pl-2.5">
            <span className="h-1.75 w-1.75 rounded-full bg-cyan-400 shadow-[0_0_8px_1px_rgba(34,211,238,0.7)]" />
            <span className="text-[12.5px] font-semibold text-[#C9BBFF]">
              AI Interview Coach · Voice-First
            </span>
          </div>
          <h1
            className="animate-fade-up mb-6 font-display text-[42px] leading-[1.06] font-bold tracking-[-0.025em] text-[#F9F9FC] sm:text-[52px] lg:text-[60px]"
            style={{ animationDelay: '0.05s' }}
          >
            Practice interviews with an AI that actually listens.
          </h1>
          <p
            className="animate-fade-up mb-9 max-w-130 text-[18.5px] leading-relaxed text-[#A5A8B8]"
            style={{ animationDelay: '0.1s' }}
          >
            MentorQ runs realistic, voice-based mock interviews tailored to your resume and target
            role — then gives you the kind of detailed feedback a real mentor would.
          </p>
          <div
            className="animate-fade-up mb-7 flex flex-wrap items-center gap-3.5"
            style={{ animationDelay: '0.15s' }}
          >
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 px-7 py-4 text-base font-bold text-white shadow-[0_12px_32px_-8px_rgba(110,86,248,0.6)] transition-[filter,transform] hover:-translate-y-px hover:brightness-110"
            >
              Start Practicing
              <ArrowRightIcon />
            </Link>
            <button
              type="button"
              onClick={() => setDemoOpen(true)}
              className="inline-flex items-center gap-2.5 rounded-xl border border-white/16 bg-white/4 px-6.5 py-4 text-base font-semibold text-ink transition-colors hover:bg-white/8"
            >
              <span className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-white/10">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="8 5 19 12 8 19" />
                </svg>
              </span>
              Watch Demo
            </button>
          </div>
          <div
            className="animate-fade-up text-[13.5px] text-[#63667A]"
            style={{ animationDelay: '0.2s' }}
          >
            No credit card required &nbsp;·&nbsp; 4.9/5 average from 2,000+ candidates
          </div>
        </div>

        <div
          className="animate-fade-up relative"
          style={{ perspective: '1600px', animationDelay: '0.15s' }}
        >
          <div
            className="animate-hero-float overflow-hidden rounded-[20px] border border-white/9 bg-[#101119] shadow-[0_50px_110px_-25px_rgba(0,0,0,0.75)]"
            style={{ transform: 'rotateY(-9deg) rotateX(5deg)' }}
          >
            <div className="flex items-center gap-1.5 border-b border-white/6 bg-white/2 px-4.5 py-3.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-2.5 text-xs text-[#6A6D7C]">mentorq.ai/interview</span>
            </div>
            <div
              className="flex flex-col items-center gap-5 px-7.5 pt-9 pb-10.5"
              style={{
                background:
                  'radial-gradient(circle at 50% 0%, rgba(110,86,248,0.14), transparent 60%)',
              }}
            >
              <div className="flex w-full items-center justify-between">
                <div>
                  <div className="text-[13.5px] font-bold text-ink">Technical Interview</div>
                  <div className="text-[11.5px] text-[#6A6D7C]">Senior Frontend Engineer</div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/12 px-2.5 py-1.25">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] font-semibold text-emerald-400">Connected</span>
                </div>
              </div>
              <div className="relative my-2.5 flex h-38 w-38 items-center justify-center">
                <div
                  className="absolute -inset-6.5 rounded-full blur-[20px]"
                  style={{
                    background: 'radial-gradient(circle, rgba(110,86,248,0.4), transparent 70%)',
                  }}
                />
                <div
                  className="animate-spin absolute inset-0 rounded-full opacity-75 blur-[2px] [animation-duration:7s]"
                  style={{
                    background: 'conic-gradient(from 0deg, #6E56F8, #A855F7, #22D3EE, #6E56F8)',
                  }}
                />
                <div
                  className="absolute inset-2.75 rounded-full"
                  style={{ background: 'radial-gradient(circle at 32% 28%, #5142CC, #191531 70%)' }}
                />
              </div>
              <div className="flex h-6 items-center gap-1.25">
                {[10, 18, 8, 22, 12, 16].map((h, i) => (
                  <span
                    key={i}
                    className="animate-wave-active w-[3px] rounded-sm bg-gradient-to-b from-[#C3A6FB] to-violet-500"
                    style={{ height: h, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
              <div className="text-[12.5px] text-ink-dim">AI Interviewer is speaking…</div>
            </div>
          </div>

          <div className="animate-chip-float-1 absolute -top-4 -left-7.5 flex items-center gap-2 rounded-xl border border-white/10 bg-surface-2 px-3.5 py-2.5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6)]">
            <span className="h-1.75 w-1.75 rounded-full bg-rose-400" />
            <span className="text-[12.5px] font-semibold text-ink">Live · 12:34</span>
          </div>
          <div className="animate-chip-float-2 absolute -right-6.5 -bottom-5.5 rounded-[14px] border border-white/10 bg-surface-2 px-4.5 py-3.5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6)]">
            <div className="mb-0.5 text-[11px] text-[#6A6D7C]">Communication</div>
            <div className="font-display text-2xl font-bold text-emerald-400">92</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-2 mx-auto max-w-320 px-6 pt-5 pb-30 sm:px-10">
        <div className="mx-auto mb-14 max-w-155 text-center">
          <div className="mb-3 text-[13px] font-bold tracking-[0.08em] text-violet-400 uppercase">
            Features
          </div>
          <h2 className="mb-3.5 font-display text-[32px] font-bold tracking-[-0.02em] text-[#F9F9FC] sm:text-[38px]">
            Practice every interview format
          </h2>
          <p className="text-[16.5px] leading-relaxed text-ink-dim">
            Four interview types, each tuned with its own question bank, pacing, and evaluation
            rubric.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-[20px] border border-hairline bg-surface p-7.5 py-7.5 transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-white/16"
            >
              <div
                className={`mb-5 flex h-11.5 w-11.5 items-center justify-center rounded-xl ${feature.iconBg}`}
              >
                {feature.icon}
              </div>
              <div className="mb-2.5 font-display text-lg font-semibold text-ink">
                {feature.title}
              </div>
              <div className="text-[14.5px] leading-relaxed text-ink-dim">
                {feature.description}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section
        id="how-it-works"
        className="relative z-2 border-y border-white/6 bg-white/[0.015] px-6 py-27.5 sm:px-10"
      >
        <div className="mx-auto max-w-280">
          <div className="mx-auto mb-17.5 max-w-140 text-center">
            <div className="mb-3 text-[13px] font-bold tracking-[0.08em] text-violet-400 uppercase">
              How it Works
            </div>
            <h2 className="mb-3.5 font-display text-[32px] font-bold tracking-[-0.02em] text-[#F9F9FC] sm:text-[38px]">
              From setup to feedback in one session
            </h2>
            <p className="text-[16.5px] leading-relaxed text-ink-dim">
              No scheduling, no scripts to memorize — just open your mic.
            </p>
          </div>
          <div className="relative grid grid-cols-1 gap-10 sm:grid-cols-3">
            <div
              className="absolute top-7 right-[16.6%] left-[16.6%] hidden h-px sm:block"
              style={{
                background: 'linear-gradient(90deg, rgba(110,86,248,0.5), rgba(34,211,238,0.5))',
              }}
            />
            {STEPS.map((step) => (
              <div key={step.number} className="relative z-1 text-center">
                <div className="mx-auto mb-5.5 flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-violet-500/50 bg-[#101119] font-display text-[19px] font-bold text-violet-400">
                  {step.number}
                </div>
                <div className="mb-2.5 font-display text-lg font-semibold text-ink">
                  {step.title}
                </div>
                <div className="mx-auto max-w-70 text-[14.5px] leading-relaxed text-ink-dim">
                  {step.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why MentorQ */}
      <section className="relative z-2 mx-auto max-w-320 px-6 py-30 sm:px-10">
        <div className="mx-auto mb-14 max-w-155 text-center">
          <div className="mb-3 text-[13px] font-bold tracking-[0.08em] text-violet-400 uppercase">
            Why MentorQ
          </div>
          <h2 className="mb-3.5 font-display text-[32px] font-bold tracking-[-0.02em] text-[#F9F9FC] sm:text-[38px]">
            Built to feel like a real mentor, not a quiz
          </h2>
          <p className="text-[16.5px] leading-relaxed text-ink-dim">
            Every session adapts to you — your resume, your role, and how you actually answer.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {WHY_CARDS.map((card) => (
            <div
              key={card.title}
              className="rounded-[20px] border border-hairline bg-surface p-7 transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-white/16"
            >
              <div className="mb-4">{card.icon}</div>
              <div className="mb-2.25 font-display text-[17px] font-semibold text-ink">
                {card.title}
              </div>
              <div className="text-sm leading-relaxed text-ink-dim">{card.description}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative z-2 mx-auto max-w-250 px-6 pt-5 pb-32.5 text-center sm:px-10">
        <h2 className="mb-4 font-display text-[32px] font-bold tracking-[-0.02em] text-[#F9F9FC] sm:text-[38px]">
          Ready to walk in prepared?
        </h2>
        <p className="mb-8.5 text-[16.5px] text-ink-dim">
          Start your first mock interview in under two minutes.
        </p>
        <Link
          to="/signup"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 px-8 py-4.25 text-[16.5px] font-bold text-white shadow-[0_12px_32px_-8px_rgba(110,86,248,0.6)] transition-[filter,transform] hover:-translate-y-px hover:brightness-110"
        >
          Start Practicing Free
          <ArrowRightIcon />
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-2 border-t border-hairline px-6 pt-16 pb-8 sm:px-10">
        <div className="mx-auto max-w-320">
          <div className="mb-12 flex flex-wrap justify-between gap-10">
            <div className="max-w-75">
              <div className="mb-3.5 flex items-center gap-2.5">
                <LogoMark size={28} />
                <span className="font-display text-base font-bold text-ink">MentorQ</span>
              </div>
              <div className="text-sm leading-relaxed text-[#6A6D7C]">
                Practice like it&apos;s real.
              </div>
            </div>
            <div className="flex gap-16">
              <div>
                <div className="mb-4 text-[13px] font-bold text-ink">Product</div>
                <div className="flex flex-col gap-2.75">
                  <a
                    href="#features"
                    className="text-sm text-[#8B8EA0] transition-colors hover:text-ink"
                  >
                    Features
                  </a>
                  <a
                    href="#how-it-works"
                    className="text-sm text-[#8B8EA0] transition-colors hover:text-ink"
                  >
                    How it Works
                  </a>
                </div>
              </div>
              <div>
                <div className="mb-4 text-[13px] font-bold text-ink">Company</div>
                <div className="flex flex-col gap-2.75">
                  <a href="#" className="text-sm text-[#8B8EA0] transition-colors hover:text-ink">
                    About
                  </a>
                  <a href="#" className="text-sm text-[#8B8EA0] transition-colors hover:text-ink">
                    Contact
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/6 pt-6.5">
            <div className="text-[13px] text-[#565A6B]">
              © 2026 MentorQ Inc. All rights reserved.
            </div>
            <div className="text-[13px] text-[#565A6B]">
              Privacy Policy &nbsp;·&nbsp; Terms of Service
            </div>
          </div>
        </div>
      </footer>

      {/* Demo modal */}
      {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}
    </main>
  )
}
