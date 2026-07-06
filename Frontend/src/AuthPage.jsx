import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowDown, Brain, Heart, Shield, Sparkles, MessageCircle, Moon, Sun } from 'lucide-react';
import './AuthPage-theme.css';

/* ═══════════════════════════════════════════════════════════════════════════
   BACKEND HELPERS (preserved from original AuthPage)
   ═══════════════════════════════════════════════════════════════════════════ */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const formatApiError = (detail) => {
  if (!detail) return 'Unknown error';
  if (Array.isArray(detail)) return detail.map((item) => item.msg || JSON.stringify(item)).join(', ');
  if (typeof detail === 'object') return detail.msg || JSON.stringify(detail);
  return String(detail);
};

const runDiagnostics = async () => {
  console.group("🔍 Backend Diagnostics");
  try {
    const res = await fetch(`${BACKEND_URL}/`);
    const data = await res.json();
    if (data.message) console.log("✅ Backend is reachable:", data.message);
    else throw new Error("Unexpected response");
  } catch (err) {
    console.error("❌ Backend unreachable:", err.message);
  }
  console.groupEnd();
};

/* ═══════════════════════════════════════════════════════════════════════════
   FONT HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const serif = { fontFamily: "'Fraunces', serif" };
const sans = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

/* ═══════════════════════════════════════════════════════════════════════════
   SCROLL HELPER
   ═══════════════════════════════════════════════════════════════════════════ */

const scrollToAuth = () => {
  const el = document.getElementById('auth-section');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const scrollToSection = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};

/* ═══════════════════════════════════════════════════════════════════════════
   BOTANICAL ILLUSTRATION
   ═══════════════════════════════════════════════════════════════════════════ */

function Rose({ cx, cy, outerR, innerR, outerColor, innerColor, centerColor, petals = 8 }) {
  return (
    <g>
      {Array.from({ length: petals }).map((_, i) => (
        <ellipse
          key={`o${i}`}
          cx={cx}
          cy={cy - outerR * 0.52}
          rx={outerR * 0.44}
          ry={outerR * 0.84}
          fill={outerColor}
          opacity={0.92}
          transform={`rotate(${(i * 360) / petals}, ${cx}, ${cy})`}
        />
      ))}
      {Array.from({ length: petals }).map((_, i) => (
        <ellipse
          key={`i${i}`}
          cx={cx}
          cy={cy - innerR * 0.52}
          rx={innerR * 0.44}
          ry={innerR * 0.84}
          fill={innerColor}
          opacity={0.95}
          transform={`rotate(${(i * 360) / petals + 360 / (petals * 2)}, ${cx}, ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={outerR * 0.19} fill={centerColor} />
      <circle cx={cx} cy={cy} r={outerR * 0.1} fill={centerColor} opacity={0.6} />
    </g>
  );
}

function AuraIllustration() {
  return (
    <svg
      viewBox="0 0 420 530"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      aria-label="A botanical illustration of a human silhouette vase with blooming flowers representing emotional growth"
    >
      <defs>
        <radialGradient id="glowBg" cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor="#F5EEC8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FAF8F3" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="vaseGrad" cx="32%" cy="28%" r="75%">
          <stop offset="0%" stopColor="#D4A49E" />
          <stop offset="60%" stopColor="#C4847A" />
          <stop offset="100%" stopColor="#A05E56" />
        </radialGradient>
        <radialGradient id="vaseShadow" cx="50%" cy="100%" r="60%">
          <stop offset="0%" stopColor="#8B4A44" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8B4A44" stopOpacity="0" />
        </radialGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="#C4847A" floodOpacity="0.18" />
        </filter>
      </defs>

      <ellipse cx="210" cy="290" rx="175" ry="210" fill="url(#glowBg)" />

      <g filter="url(#softShadow)">
        <path
          d="
            M 210,468
            C 158,468 114,448 105,415
            C 96,382 112,360 127,345
            C 142,330 160,322 165,308
            C 169,298 167,287 166,276
            C 165,265 160,257 161,247
            C 162,236 171,228 181,222
            C 190,216 200,214 210,214
            C 220,214 230,216 239,222
            C 249,228 258,236 259,247
            C 260,257 255,265 254,276
            C 253,287 251,298 255,308
            C 260,322 278,330 293,345
            C 308,360 324,382 315,415
            C 306,448 262,468 210,468
            Z
          "
          fill="url(#vaseGrad)"
        />
        <ellipse cx="210" cy="464" rx="80" ry="12" fill="url(#vaseShadow)" />
      </g>

      <path d="M 183,242 C 186,230 194,221 207,217" stroke="rgba(255,255,255,0.38)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 178,268 C 179,260 181,254 185,249" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <ellipse cx="210" cy="216" rx="48" ry="11" fill="#9A5049" opacity="0.28" />

      {/* Stems */}
      <path d="M 210,216 C 210,196 210,172 210,152" stroke="#7A9E7E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 210,202 C 198,193 178,180 162,158" stroke="#7A9E7E" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M 210,202 C 222,193 242,180 258,158" stroke="#7A9E7E" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M 210,212 C 194,207 172,212 154,196" stroke="#7A9E7E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M 210,212 C 226,207 248,212 266,196" stroke="#7A9E7E" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Leaves */}
      <path d="M 168,202 C 146,188 140,168 152,155 C 163,168 166,188 168,202 Z" fill="#8FAD88" opacity={0.88} />
      <path d="M 168,202 C 157,184 158,165 152,155" stroke="#7A9E7E" strokeWidth="0.8" fill="none" />
      <path d="M 252,202 C 274,188 280,168 268,155 C 257,168 254,188 252,202 Z" fill="#8FAD88" opacity={0.88} />
      <path d="M 252,202 C 263,184 262,165 268,155" stroke="#7A9E7E" strokeWidth="0.8" fill="none" />
      <path d="M 157,196 C 138,188 130,172 140,160 C 150,172 155,186 157,196 Z" fill="#9DBD9A" opacity={0.78} />
      <path d="M 263,196 C 282,188 290,172 280,160 C 270,172 265,186 263,196 Z" fill="#9DBD9A" opacity={0.78} />
      <path d="M 122,378 C 102,364 95,344 108,333 C 119,346 122,364 122,378 Z" fill="#8FAD88" opacity={0.52} transform="rotate(-8, 108, 355)" />
      <path d="M 298,378 C 318,364 325,344 312,333 C 301,346 298,364 298,378 Z" fill="#8FAD88" opacity={0.52} transform="rotate(8, 312, 355)" />

      {/* Flowers */}
      <Rose cx={210} cy={142} outerR={40} innerR={27} outerColor="#D4A4A0" innerColor="#C4847A" centerColor="#9A5049" petals={10} />
      <Rose cx={160} cy={146} outerR={27} innerR={18} outerColor="#F5EEC8" innerColor="#EDD58A" centerColor="#C8A530" petals={8} />
      <Rose cx={260} cy={148} outerR={25} innerR={16} outerColor="#E8A87C" innerColor="#D4895A" centerColor="#B06030" petals={8} />
      <Rose cx={140} cy={158} outerR={15} innerR={9} outerColor="#F0D4C8" innerColor="#D4A4A0" centerColor="#C4847A" petals={6} />
      <Rose cx={280} cy={160} outerR={14} innerR={8} outerColor="#EAC09A" innerColor="#D4895A" centerColor="#B06030" petals={6} />

      {/* Floating leaves */}
      <path d="M 98,128 C 84,115 82,96 95,87 C 101,102 103,117 98,128 Z" fill="#8FAD88" opacity={0.55} transform="rotate(-22, 92, 108)" />
      <path d="M 322,122 C 336,109 338,90 325,81 C 319,96 317,111 322,122 Z" fill="#8FAD88" opacity={0.55} transform="rotate(22, 328, 102)" />
      <path d="M 66,185 C 52,172 50,153 63,144 C 69,159 71,174 66,185 Z" fill="#9DBD9A" opacity={0.45} transform="rotate(-18, 58, 165)" />
      <path d="M 354,178 C 368,165 370,146 357,137 C 351,152 349,167 354,178 Z" fill="#9DBD9A" opacity={0.45} transform="rotate(18, 362, 158)" />

      {/* Botanical dots */}
      <circle cx="82" cy="205" r="4.5" fill="#C4847A" opacity={0.28} />
      <circle cx="74" cy="248" r="3" fill="#8FAD88" opacity={0.38} />
      <circle cx="60" cy="295" r="2.5" fill="#D4895A" opacity={0.28} />
      <circle cx="338" cy="200" r="4.5" fill="#D4895A" opacity={0.28} />
      <circle cx="346" cy="242" r="3" fill="#C4847A" opacity={0.32} />
      <circle cx="360" cy="290" r="2.5" fill="#8FAD88" opacity={0.28} />
      <circle cx="158" cy="80" r="3.5" fill="#8FAD88" opacity={0.42} />
      <circle cx="268" cy="76" r="3" fill="#D4895A" opacity={0.38} />
      <circle cx="210" cy="64" r="2.5" fill="#C4847A" opacity={0.3} />
      <circle cx="182" cy="70" r="2" fill="#EDD58A" opacity={0.5} />
      <circle cx="240" cy="68" r="2" fill="#8FAD88" opacity={0.38} />

      {/* Extra leaflets */}
      <path d="M 345,155 C 356,143 360,128 351,120 C 344,132 342,146 345,155 Z" fill="#8FAD88" opacity={0.46} transform="rotate(28, 350, 138)" />
      <path d="M 75,158 C 64,146 60,131 69,123 C 76,135 78,149 75,158 Z" fill="#8FAD88" opacity={0.46} transform="rotate(-28, 70, 141)" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   NAV
   ═══════════════════════════════════════════════════════════════════════════ */

function Nav({ darkMode, toggleDarkMode }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const navItems = [
    { label: "Features", id: "features-section" },
    { label: "How It Works", id: "how-it-works-section" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-14 py-5 transition-all duration-500 ${
        scrolled
          ? "bg-[var(--auth-bg)]/88 backdrop-blur-xl shadow-[0_4px_32px_rgba(180,130,120,0.1)]"
          : ""
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[var(--auth-primary)] flex items-center justify-center shadow-[0_2px_12px_rgba(196,132,122,0.38)]">
          <Brain className="w-4 h-4 text-[#FAF8F3]" strokeWidth={1.5} />
        </div>
        <span className="text-xl font-semibold text-[var(--auth-text-primary)] tracking-tight" style={serif}>
          AURA
        </span>
      </div>

      {/* Right side: Nav and CTA */}
      <div className="flex items-center gap-4">
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1.5">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => scrollToSection(item.id)}
              className="px-4 py-2 rounded-full text-sm text-[#5A4A46] bg-white/55 hover:bg-[#F5EEC8]/80 shadow-[0_2px_10px_rgba(0,0,0,0.07),0_1px_3px_rgba(180,130,120,0.1)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] cursor-pointer"
              style={sans}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Primary CTA */}
        <button
          onClick={toggleDarkMode}
          className="auth-theme-toggle mr-2 flex-shrink-0"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          onClick={scrollToAuth}
          className="flex items-center gap-2 px-4 md:px-5 py-2.5 auth-primary-btn rounded-full text-sm font-medium shadow-md transition-all duration-300 cursor-pointer flex-shrink-0"
          style={sans}
        >
          <span className="hidden sm:inline">Get Started</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════════════════════════ */

function Hero() {
  return (
    <section className="min-h-screen pt-28 pb-20 px-8 md:px-14 lg:px-20 flex items-center">
      <div className="max-w-[1280px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-12 lg:gap-20 items-center">

        {/* Left: Editorial text */}
        <div className="space-y-9">

          {/* Status pill */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-[#8FAD88]/30 bg-[#8FAD88]/10"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#8FAD88] animate-pulse" />
            <span className="text-[11px] font-medium text-[#5E8A5B] tracking-[0.12em] uppercase" style={sans}>
              AI Mental Wellness — Now Available
            </span>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="text-[2.6rem] sm:text-[3.4rem] md:text-[4.2rem] lg:text-[4.8rem] font-light text-[var(--auth-text-primary)] leading-[1.08] tracking-tight"
            style={serif}
          >
            Adaptive{" "}
            <em className="not-italic italic text-[#C4847A]">Understanding</em>
            {" "}of Responses
            {" "}and{" "}
            <em className="not-italic italic text-[#C4847A]">Affect</em>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg text-[var(--auth-text-secondary)] leading-[1.72] max-w-[480px]"
            style={{ ...sans, fontWeight: 300 }}
          >
            Understanding the importance of mental well-being through empathetic AI
            conversations that listen, adapt, and genuinely care for your emotional world.
          </motion.p>

          {/* CTA row */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-5 flex-wrap"
          >
            <button
              onClick={scrollToAuth}
              className="group flex items-center gap-3.5 px-8 py-4 bg-[var(--auth-primary)] text-[#FAF8F3] rounded-2xl text-base font-medium shadow-[0_10px_36px_rgba(196,132,122,0.38)] hover:bg-[var(--auth-primary-hover)] hover:shadow-[0_14px_44px_rgba(196,132,122,0.5)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
              style={sans}
            >
              Get Started
              <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors duration-200">
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>

            <button
              onClick={() => scrollToSection('how-it-works-section')}
              className="flex items-center gap-2.5 text-[var(--auth-text-secondary)] hover:text-[var(--auth-text-primary)] transition-colors duration-200 text-sm cursor-pointer"
              style={sans}
            >
              <span className="w-9 h-9 rounded-full border border-[#C4847A]/30 bg-white/60 flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
                <Sparkles className="w-4 h-4 text-[#C4847A]" strokeWidth={1.5} />
              </span>
              See how it works
            </button>
          </motion.div>
        </div>

        {/* Right: Botanical illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[460px] mx-auto lg:mx-0 lg:ml-auto"
        >
          <div className="absolute inset-0 -m-10 rounded-full bg-gradient-to-b from-[#F5EEC8]/60 via-[#F5EEC8]/20 to-transparent blur-3xl pointer-events-none" />
          <div className="relative">
            <AuraIllustration />
          </div>

          {/* Floating mood card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="absolute top-[18%] -left-6 bg-white/80 backdrop-blur-lg rounded-2xl px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.09)] border border-[var(--auth-border)]"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#F5EEC8] flex items-center justify-center">
                <Heart className="w-4 h-4 text-[#C4847A]" strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-[11px] text-[var(--auth-text-muted)]" style={sans}>Emotional clarity</div>
                <div className="text-xs font-semibold text-[var(--auth-text-primary)]" style={sans}>Feeling grounded today</div>
              </div>
            </div>
          </motion.div>

          {/* Floating session card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.85 }}
            className="absolute bottom-[22%] -right-5 bg-white/80 backdrop-blur-lg rounded-2xl px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.09)] border border-[var(--auth-border)]"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#EAF0E8] flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-[#8FAD88]" strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-[11px] text-[var(--auth-text-muted)]" style={sans}>Daily session</div>
                <div className="text-xs font-semibold text-[var(--auth-text-primary)]" style={sans}>12-min check-in ✓</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FEATURES
   ═══════════════════════════════════════════════════════════════════════════ */

const FEATURES = [
  {
    icon: Heart,
    title: "Empathetic Listening",
    desc: "AURA reads emotional cues in your words and tone, responding with warmth and genuine understanding — never scripted, always present.",
    iconColor: "#C4847A",
    iconBg: "rgba(196,132,122,0.12)",
    cardBg: "#F5EEC8",
  },
  {
    icon: Brain,
    title: "Adaptive Intelligence",
    desc: "Every conversation refines AURA's model of you — your patterns, your triggers, and the small things that bring you back to calm.",
    iconColor: "#8FAD88",
    iconBg: "rgba(143,173,136,0.14)",
    cardBg: "#EAF0E8",
  },
  {
    icon: Shield,
    title: "Private by Design",
    desc: "Your thoughts stay yours. End-to-end encryption and zero data retention mean the most vulnerable parts of you are never commodified.",
    iconColor: "#D4895A",
    iconBg: "rgba(212,137,90,0.12)",
    cardBg: "#F9EEE4",
  },
];

function Features() {
  return (
    <section id="features-section" className="py-24 px-8 md:px-14 lg:px-20">
      <div className="max-w-[1280px] mx-auto">
        <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="text-[11px] font-medium text-[#8FAD88] tracking-[0.15em] uppercase mb-4" style={sans}>
              Core Features
            </p>
            <h2 className="text-4xl md:text-5xl text-[var(--auth-text-primary)] leading-[1.12] font-light max-w-lg" style={serif}>
              Built for genuine{" "}
              <em className="italic text-[#C4847A] not-italic" style={{ fontStyle: "italic" }}>
                emotional intelligence
              </em>
            </h2>
          </div>
          <p className="text-sm text-[var(--auth-text-muted)] max-w-xs leading-relaxed" style={{ ...sans, fontWeight: 300 }}>
            Every feature is designed with one goal: helping you feel genuinely understood.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc, iconColor, iconBg, cardBg }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="auth-feature-card group p-6 sm:p-8 rounded-[1.75rem] shadow-[0_4px_24px_rgba(0,0,0,0.055)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.1)] transition-all duration-350 hover:-translate-y-1 cursor-default"
              style={{ backgroundColor: cardBg, color: "var(--auth-text-primary)" }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-7" style={{ backgroundColor: iconBg }}>
                <Icon className="w-5 h-5" style={{ color: iconColor }} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold text-[var(--auth-text-primary)] mb-3" style={serif}>
                {title}
              </h3>
              <p className="text-sm text-[var(--auth-text-secondary)] leading-[1.75]" style={{ ...sans, fontWeight: 300 }}>
                {desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOW IT WORKS
   ═══════════════════════════════════════════════════════════════════════════ */

const STEPS = [
  {
    num: "01",
    title: "Share your thoughts",
    desc: "Begin a conversation. AURA creates a safe, judgment-free space where your words are received with complete openness.",
  },
  {
    num: "02",
    title: "AURA understands",
    desc: "Through advanced affect recognition, AURA identifies your emotional state and responds with precisely calibrated empathy.",
  },
  {
    num: "03",
    title: "Grow together",
    desc: "Over weeks and months, AURA builds a deep portrait of your inner world, helping you navigate life with greater clarity.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works-section" className="py-24 px-8 md:px-14 lg:px-20" style={{ backgroundColor: "rgba(245,238,200,0.22)" }}>
      <div className="max-w-[1280px] mx-auto">
        <div className="mb-16">
          <p className="text-[11px] font-medium text-[#8FAD88] tracking-[0.15em] uppercase mb-4" style={sans}>
            Process
          </p>
          <h2 className="text-4xl md:text-5xl text-[var(--auth-text-primary)] leading-[1.12] font-light max-w-sm" style={serif}>
            How healing{" "}
            <em style={{ fontStyle: "italic", color: "#C4847A" }}>unfolds</em>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-14 relative">
          <div className="hidden md:block absolute top-14 left-[17%] right-[17%] h-px bg-gradient-to-r from-transparent via-[#C4847A]/25 to-transparent" />

          {STEPS.map(({ num, title, desc }, i) => (
            <motion.div
              key={num}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.14, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="text-[5rem] font-light text-[#C4847A]/18 leading-none mb-5 select-none" style={serif}>
                {num}
              </div>
              <h3 className="text-xl font-semibold text-[var(--auth-text-primary)] mb-3" style={serif}>
                {title}
              </h3>
              <p className="text-sm text-[var(--auth-text-secondary)] leading-[1.75]" style={{ ...sans, fontWeight: 300 }}>
                {desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TESTIMONIAL QUOTE
   ═══════════════════════════════════════════════════════════════════════════ */

function Quote() {
  return (
    <section id="testimonials-section" className="py-28 px-8 md:px-14 lg:px-20">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="text-[5.5rem] text-[#C4847A]/22 leading-none mb-4 select-none" style={serif}>
            &ldquo;
          </div>
          <blockquote
            className="text-3xl md:text-4xl text-[var(--auth-text-primary)] leading-[1.38] font-light mb-10"
            style={{ ...serif, fontStyle: "italic" }}
          >
            AURA didn&apos;t just help me manage anxiety — it helped me understand it.
            For the first time in years, I felt truly heard.
          </blockquote>
          <div className="flex items-center justify-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-[#F5EEC8] flex items-center justify-center shadow-[0_2px_12px_rgba(196,132,122,0.18)]">
              <span className="text-sm font-semibold text-[#C4847A]" style={serif}>
                M
              </span>
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-[var(--auth-text-primary)]" style={sans}>
                Maya Chen
              </div>
              <div className="text-xs text-[var(--auth-text-muted)]" style={{ ...sans, fontWeight: 300 }}>
                Licensed therapist &amp; AURA user, 8 months
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUTH SECTION (Login / Signup — combined with CTA)
   All backend logic preserved from original AuthPage.jsx
   ═══════════════════════════════════════════════════════════════════════════ */

function AuthSection({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('login');
  const [loginMethod, setLoginMethod] = useState('email');
  const [profession, setProfession] = useState('');
  const [otherProfession, setOtherProfession] = useState('');
  const [loginData, setLoginData] = useState({ email: '', phone: '', password: '' });
  const [signupData, setSignupData] = useState({ name: '', email: '', phone: '', age: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const validateEmailFormat = (emailStr) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(emailStr);

  const handlePhoneInputChange = (val, targetForm) => {
    const clean = val.replace(/\D/g, '');
    if (clean.length <= 10) {
      if (targetForm === 'login') setLoginData(prev => ({ ...prev, phone: clean }));
      else setSignupData(prev => ({ ...prev, phone: clean }));
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setIsLoggingIn(true);

    const identifier = loginMethod === 'email' ? loginData.email : loginData.phone;
    if (!identifier || !loginData.password) { alert("❌ Please fill in all fields."); setIsLoggingIn(false); return; }
    if (loginMethod === 'email' && !validateEmailFormat(identifier)) { alert("❌ Please enter a valid email."); setIsLoggingIn(false); return; }
    if (loginMethod === 'phone' && identifier.length !== 10) { alert("❌ Phone number must be exactly 10 digits."); setIsLoggingIn(false); return; }

    try {
      // Fetch IP
      let ipAddress = 'unknown';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        ipAddress = ipData.ip;
      } catch { console.warn("Could not fetch IP"); }

      // Fetch location
      let lat = null;
      let long = null;
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
        });
        lat = position.coords.latitude;
        long = position.coords.longitude;
      } catch (err) {
        console.warn("Location unavailable:", err.message);
      }

      // Call backend signin
      const response = await fetch(`${BACKEND_URL}/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: identifier,
          password: loginData.password,
          ip: ipAddress,
          lat: lat ? String(lat) : null,
          long: long ? String(long) : null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 && data.detail === "User not found") {
          setSignupData(prev => ({ ...prev, email: loginMethod === 'email' ? loginData.email : '', phone: loginMethod === 'phone' ? loginData.phone : '' }));
          alert("No account found. Redirecting to Sign Up.");
          setActiveTab('signup');
        } else {
          alert(`🔴 Login failed. ${formatApiError(data.detail)}`);
        }
        setIsLoggingIn(false);
        return;
      }

      alert(`✅ Logged in successfully! Welcome back, ${data.name} 👋`);
      onLoginSuccess({
        name: data.name,
        email: loginMethod === 'email' ? identifier : '',
        id: data.user_id,
        logId: data.log_id,
        isAdmin: data.is_admin || false
      });

    } catch (err) {
      alert(`🔴 Unexpected error: ${err.message}`);
      console.error("Login error:", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    const parsedAge = parseInt(signupData.age, 10);
    if (isNaN(parsedAge) || parsedAge < 8 || parsedAge > 100) { alert("❌ Invalid age. Must be between 8 and 100."); return; }
    if (!validateEmailFormat(signupData.email)) { alert("❌ Invalid email format."); return; }
    if (signupData.phone.length !== 10) { alert("❌ Phone must be exactly 10 digits."); return; }
    if (!signupData.name || !signupData.password) { alert("❌ Name and password are required."); return; }
    if (!profession) { alert("❌ Please select a profession."); return; }
    if (profession === 'Other' && !otherProfession.trim()) { alert("❌ Please specify your profession."); return; }

    const finalProfession = profession === 'Other' ? otherProfession.trim() : profession;

    try {
      const response = await fetch(`${BACKEND_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupData.name,
          email: signupData.email,
          phone: signupData.phone,
          age: parsedAge,
          password: signupData.password,
          profession: finalProfession
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.detail === "User already exists") {
          alert("❌ Account already exists. Please log in.");
          setActiveTab('login');
        } else {
          alert(`🔴 Signup failed. ${formatApiError(data.detail)}`);
        }
        return;
      }

      alert(`✅ Account created successfully! Please log in. 👋`);
      setActiveTab('login');
    } catch (err) {
      alert(`🔴 Unexpected error: ${err.message}`);
      console.error("Signup error:", err);
    }
  };

  /* ── Shared input style ── */
  const inputClass = "w-full px-5 py-3.5 border border-[rgba(180,150,140,0.25)] rounded-2xl text-base bg-white text-[var(--auth-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#C4847A]/40 placeholder:text-[var(--auth-text-muted)] transition-all duration-200";
  const inputClassSm = "w-full px-4 py-3 border border-[rgba(180,150,140,0.25)] rounded-2xl text-sm bg-white text-[var(--auth-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#C4847A]/40 placeholder:text-[var(--auth-text-muted)] transition-all duration-200";

  return (
    <section id="auth-section" className="py-20 px-8 md:px-14 lg:px-20">
      <div className="max-w-[1280px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-[2.25rem] bg-[var(--auth-primary)] overflow-hidden"
        >
          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/[0.07] pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-black/[0.06] pointer-events-none" />
          <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full bg-white/[0.05] -translate-y-1/2 pointer-events-none" />

          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 px-8 md:px-14 lg:px-20 py-16 lg:py-20">

            {/* Left: CTA messaging */}
            <div className="flex flex-col justify-center">
              <p className="text-[11px] font-medium text-white/55 tracking-[0.15em] uppercase mb-5" style={sans}>
                Begin Today
              </p>
              <h2 className="text-4xl md:text-5xl text-[#FAF8F3] leading-[1.12] font-light mb-6" style={serif}>
                Begin your journey toward{" "}
                <em style={{ fontStyle: "italic" }}>emotional clarity</em>
              </h2>
              <p className="text-[#FAF8F3]/72 mb-8 text-lg leading-[1.72]" style={{ ...sans, fontWeight: 300 }}>
                Join people discovering what it means to be genuinely understood.
              </p>
            </div>

            {/* Right: Auth form */}
            <div className="bg-[var(--auth-bg)] rounded-[1.75rem] p-8 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.15)]">

              {/* Tab toggle */}
              <div className="flex bg-[#EDE8DF] p-1 rounded-xl mb-8">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-white text-[var(--auth-text-primary)] shadow-sm'
                      : 'text-[var(--auth-text-muted)] hover:text-[var(--auth-text-secondary)]'
                  }`}
                  style={sans}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('signup')}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    activeTab === 'signup'
                      ? 'bg-white text-[var(--auth-text-primary)] shadow-sm'
                      : 'text-[var(--auth-text-muted)] hover:text-[var(--auth-text-secondary)]'
                  }`}
                  style={sans}
                >
                  Sign Up
                </button>
              </div>

              {activeTab === 'login' ? (
                /* ── LOGIN FORM ── */
                <div className="space-y-5">
                  <div>
                    <h3 className="text-2xl font-semibold text-[var(--auth-text-primary)] tracking-tight mb-1" style={serif}>
                      Welcome back
                    </h3>
                    <p className="text-sm text-[var(--auth-text-muted)]" style={{ ...sans, fontWeight: 300 }}>
                      Pick up where you left off.
                    </p>
                  </div>

                  {/* Email / Phone toggle */}
                  <div className="flex bg-[#EDE8DF] p-0.5 rounded-lg max-w-[180px]">
                    <button
                      type="button"
                      onClick={() => setLoginMethod('email')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        loginMethod === 'email' ? 'bg-white text-[var(--auth-text-primary)] shadow-sm' : 'text-[var(--auth-text-muted)]'
                      }`}
                      style={sans}
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginMethod('phone')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        loginMethod === 'phone' ? 'bg-white text-[var(--auth-text-primary)] shadow-sm' : 'text-[var(--auth-text-muted)]'
                      }`}
                      style={sans}
                    >
                      Phone
                    </button>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    {loginMethod === 'email' ? (
                      <input
                        type="text"
                        placeholder="Email Address"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        className={inputClass}
                        style={sans}
                      />
                    ) : (
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="10-Digit Phone Number"
                        value={loginData.phone}
                        onChange={(e) => handlePhoneInputChange(e.target.value, 'login')}
                        className={inputClass}
                        style={sans}
                      />
                    )}
                    <input
                      type="password"
                      placeholder="Password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className={inputClass}
                      style={sans}
                    />
                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full py-4 bg-[var(--auth-primary)] hover:bg-[var(--auth-primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed text-[#FAF8F3] font-semibold rounded-2xl shadow-[0_6px_20px_rgba(196,132,122,0.38)] hover:shadow-[0_10px_28px_rgba(196,132,122,0.5)] transition-all duration-300 text-base cursor-pointer"
                      style={sans}
                    >
                      {isLoggingIn ? 'Signing in...' : 'Begin Session'}
                    </button>
                  </form>

                  <div className="text-center pt-1">
                    <p className="text-sm text-[var(--auth-text-muted)]" style={sans}>
                      New here?{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTab('signup')}
                        className="text-[#C4847A] font-semibold hover:text-[#B8675E] transition-colors cursor-pointer"
                      >
                        Create an account
                      </button>
                    </p>
                  </div>
                </div>
              ) : (
                /* ── SIGNUP FORM ── */
                <div className="space-y-5">
                  <div>
                    <h3 className="text-2xl font-semibold text-[var(--auth-text-primary)] tracking-tight mb-1" style={serif}>
                      Join AURA
                    </h3>
                    <p className="text-sm text-[var(--auth-text-muted)]" style={{ ...sans, fontWeight: 300 }}>
                      Create your private wellness space.
                    </p>
                  </div>

                  <form onSubmit={handleSignupSubmit} className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={signupData.name}
                      onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                      className={inputClassSm}
                      style={sans}
                    />
                    <div className="flex gap-2.5">
                      <input
                        type="number"
                        min="8"
                        max="100"
                        placeholder="Age"
                        value={signupData.age}
                        onChange={(e) => setSignupData({ ...signupData, age: e.target.value })}
                        className={`${inputClassSm} w-1/3`}
                        style={sans}
                      />
                      <select
                        value={profession}
                        onChange={(e) => setProfession(e.target.value)}
                        className={`${inputClassSm} w-2/3`}
                        style={sans}
                      >
                        <option value="" disabled>Select Profession</option>
                        <option value="Student">Student</option>
                        <option value="Working Professional">Working Professional</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    {profession === 'Other' && (
                      <input
                        type="text"
                        placeholder="Specify profession"
                        value={otherProfession}
                        onChange={(e) => setOtherProfession(e.target.value)}
                        className={inputClassSm}
                        style={sans}
                      />
                    )}
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Phone Number (10 Digits)"
                      value={signupData.phone}
                      onChange={(e) => handlePhoneInputChange(e.target.value, 'signup')}
                      className={inputClassSm}
                      style={sans}
                    />
                    <input
                      type="text"
                      placeholder="Email Address (name@domain.com)"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      className={inputClassSm}
                      style={sans}
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      className={inputClassSm}
                      style={sans}
                    />
                    <button
                      type="submit"
                      className="w-full py-3.5 bg-[var(--auth-primary)] hover:bg-[var(--auth-primary-hover)] text-[#FAF8F3] font-semibold rounded-2xl shadow-[0_6px_20px_rgba(196,132,122,0.38)] hover:shadow-[0_10px_28px_rgba(196,132,122,0.5)] transition-all duration-300 text-sm uppercase tracking-wide cursor-pointer"
                      style={sans}
                    >
                      Create Account
                    </button>
                  </form>

                  <div className="text-center pt-1">
                    <p className="text-sm text-[var(--auth-text-muted)]" style={sans}>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTab('login')}
                        className="text-[#C4847A] font-semibold hover:text-[#B8675E] transition-colors cursor-pointer"
                      >
                        Sign in
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════════════════════ */

function Footer() {
  const [tick, setTick] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => !t), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <footer className="pt-12 pb-10 px-8 md:px-14 lg:px-20 border-t border-[#C4847A]/10">
      <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[var(--auth-primary)] flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-[#FAF8F3]" strokeWidth={1.5} />
          </div>
          <span className="text-lg font-semibold text-[var(--auth-text-primary)]" style={serif}>
            AURA
          </span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6">
          {["Privacy", "Terms", "Contact", "Blog"].map((link) => (
            <button
              key={link}
              className="text-xs text-[var(--auth-text-muted)] hover:text-[var(--auth-text-primary)] transition-colors duration-200 cursor-pointer"
              style={sans}
            >
              {link}
            </button>
          ))}
        </div>

        {/* Copyright */}
        <p className="text-xs text-[var(--auth-text-muted)] hidden md:block" style={{ ...sans, fontWeight: 300 }}>
          © 2024 AURA Health Technologies
        </p>

        {/* Animated scroll indicator */}
        <motion.div
          animate={{ y: tick ? 5 : 0 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-9 h-9 rounded-full border border-[#C4847A]/28 bg-white/50 flex items-center justify-center shadow-[0_2px_10px_rgba(196,132,122,0.1)]">
            <Brain className="w-4 h-4 text-[#C4847A]/55" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col items-center gap-0.5 mt-0.5">
            <div className="w-px h-4 bg-gradient-to-b from-[#C4847A]/30 to-transparent" />
            <ArrowDown className="w-2.5 h-2.5 text-[#C4847A]/35" />
          </div>
          <span className="text-[9px] tracking-[0.18em] text-[var(--auth-text-muted)] uppercase mt-0.5" style={sans}>
            Scroll
          </span>
        </motion.div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function AuthPage({ onLoginSuccess }) {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  useEffect(() => { runDiagnostics(); }, []);

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  return (
    <div className="auth-page-container min-h-screen overflow-x-hidden" data-theme={darkMode ? 'dark' : 'light'}>
      <Nav darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      <Hero />
      <Features />
      <HowItWorks />
      <AuthSection onLoginSuccess={onLoginSuccess} />
    </div>
  );
}