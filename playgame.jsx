import { useState, useEffect, useRef } from "react";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const ARENAS = [
  { id: 1, name: "Arena Praia Norte", city: "São Paulo", courts: 8, contact: "arena.praia@email.com" },
  { id: 2, name: "Beach Club Central", city: "Santos", courts: 6, contact: "beachclub@email.com" },
  { id: 3, name: "Arena Sunset", city: "Guarujá", courts: 4, contact: "sunset@email.com" },
  { id: 4, name: "Sport Beach Arena", city: "São Paulo", courts: 10, contact: "sport@email.com" },
];

const MODALITIES = [
  "Vôlei de Dupla Masculino", "Vôlei de Dupla Feminino", "Vôlei de Dupla Misto",
  "Vôlei 4x4 Masculino", "Vôlei 4x4 Feminino", "Vôlei 4x4 Misto",
  "Futevôlei Masculino", "Futevôlei Feminino", "Futevôlei Misto",
  "Beach Tennis 1x1 Masculino", "Beach Tennis 1x1 Feminino",
  "Beach Tennis 2x2 Masculino", "Beach Tennis 2x2 Feminino", "Beach Tennis 2x2 Misto",
];

const INITIAL_EVENTS = [
  {
    id: 1, name: "Open de Beach Tennis SP", modality: "Beach Tennis 2x2 Misto",
    arenaId: 1, date: "2026-04-15", rules: "Melhor de 3 sets. Formato de chave dupla eliminatória.",
    price: 120, maxTeams: 32, status: "confirmed", organizerId: "org1",
    registrations: [
      { athleteId: "ath1", partner: "Carlos Souza", status: "paid", joinedAt: "2026-03-10" },
      { athleteId: "ath2", partner: "Ana Lima", status: "pending", joinedAt: "2026-03-12" },
    ],
    whatsappLink: "https://chat.whatsapp.com/abc123",
    comments: [{ athleteId: "ath2", text: "Qual o horário do check-in?", date: "2026-03-14", read: false }]
  },
  {
    id: 2, name: "Torneio Futevôlei Verão", modality: "Futevôlei Masculino",
    arenaId: 2, date: "2026-05-10", rules: "Sets até 18 pontos. Saque rotativo.",
    price: 80, maxTeams: 16, status: "pending", organizerId: "org1",
    registrations: [],
    whatsappLink: "https://chat.whatsapp.com/def456",
    comments: []
  },
];

const INITIAL_USERS = [
  { id: "org1", name: "Ricardo Mendes", email: "org@demo.com", password: "123", role: "organizer", avatar: null },
  { id: "ath1", name: "João Pedro Silva", email: "atleta@demo.com", password: "123", role: "athlete", avatar: null, cpf: "123.456.789-00", phone: "(11) 99999-0001" },
  { id: "ath2", name: "Maria Oliveira", email: "maria@demo.com", password: "123", role: "athlete", avatar: null, cpf: "987.654.321-00", phone: "(11) 99999-0002" },
];

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, color = "currentColor", fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const Icons = {
  trophy: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  bell: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  plus: "M12 5v14M5 12h14",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 1 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  mapPin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  whatsapp: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  message: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  camera: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  award: "M8.21 13.89L7 23l5-3 5 3-1.21-9.12M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 7H3M12 1v2",
  home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --white: #FFFFFF;
    --gray-50: #F7F8F9;
    --gray-100: #EDEDEE;
    --gray-200: #D5D5D7;
    --gray-300: #ABABAF;
    --gray-500: #6B6B70;
    --gray-700: #3A3A3E;
    --black: #0E0E10;
    --orange: #F05A1A;
    --orange-light: #FF7A3D;
    --orange-dark: #C44310;
    --military: #4A5C3A;
    --military-light: #6B7F57;
    --military-dark: #2E3B23;
    --font-display: 'Barlow Condensed', sans-serif;
    --font-body: 'Barlow', sans-serif;
    --radius: 8px;
    --radius-lg: 16px;
    --shadow: 0 2px 12px rgba(0,0,0,0.08);
    --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
  }

  body { font-family: var(--font-body); background: var(--gray-50); color: var(--black); }

  /* ── LANDING ── */
  .landing {
    min-height: 100vh;
    background: var(--black);
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
  .landing::before {
    content: '';
    position: absolute;
    inset: 0;
    background: 
      radial-gradient(circle at 20% 50%, rgba(240,90,26,0.15) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(74,92,58,0.2) 0%, transparent 50%);
  }
  .landing-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 48px;
    position: relative;
    z-index: 2;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .logo-icon {
    width: 44px;
    height: 44px;
    background: var(--orange);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 22px;
    color: white;
    letter-spacing: -1px;
  }
  .logo-text {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 800;
    color: white;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .logo-text span { color: var(--orange); }
  .landing-hero {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 60px 48px;
    position: relative;
    z-index: 2;
  }
  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(240,90,26,0.15);
    border: 1px solid rgba(240,90,26,0.3);
    color: var(--orange-light);
    padding: 6px 16px;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 28px;
  }
  .hero-title {
    font-family: var(--font-display);
    font-size: clamp(56px, 8vw, 100px);
    font-weight: 900;
    color: white;
    line-height: 0.9;
    text-transform: uppercase;
    letter-spacing: -2px;
    margin-bottom: 24px;
  }
  .hero-title span { color: var(--orange); }
  .hero-sub {
    font-size: 18px;
    color: var(--gray-300);
    max-width: 520px;
    line-height: 1.6;
    margin-bottom: 48px;
  }
  .hero-btns {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 28px;
    border-radius: var(--radius);
    font-family: var(--font-body);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
    text-decoration: none;
    white-space: nowrap;
  }
  .btn-primary { background: var(--orange); color: white; }
  .btn-primary:hover { background: var(--orange-light); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(240,90,26,0.4); }
  .btn-secondary { background: transparent; color: white; border: 1.5px solid rgba(255,255,255,0.25); }
  .btn-secondary:hover { border-color: white; background: rgba(255,255,255,0.05); }
  .btn-military { background: var(--military); color: white; }
  .btn-military:hover { background: var(--military-light); }
  .btn-ghost { background: transparent; color: var(--gray-700); border: 1.5px solid var(--gray-200); }
  .btn-ghost:hover { border-color: var(--gray-300); background: var(--gray-100); }
  .btn-danger { background: #EF4444; color: white; }
  .btn-danger:hover { background: #DC2626; }
  .btn-sm { padding: 7px 16px; font-size: 13px; }
  .btn-xs { padding: 5px 12px; font-size: 12px; }

  /* ── AUTH MODAL ── */
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .modal {
    background: white;
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 480px;
    padding: 40px;
    position: relative;
    animation: slideUp 0.25s ease;
    max-height: 90vh;
    overflow-y: auto;
  }
  .modal-wide { max-width: 680px; }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 28px;
  }
  .modal-title {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .modal-close {
    width: 36px; height: 36px;
    border-radius: 50%;
    border: none;
    background: var(--gray-100);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--gray-500);
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .modal-close:hover { background: var(--gray-200); color: var(--black); }

  /* ── FORM ── */
  .form-group { margin-bottom: 20px; }
  .form-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--gray-700);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .form-input {
    width: 100%;
    padding: 11px 14px;
    border: 1.5px solid var(--gray-200);
    border-radius: var(--radius);
    font-family: var(--font-body);
    font-size: 15px;
    color: var(--black);
    background: white;
    transition: border-color 0.15s;
    outline: none;
  }
  .form-input:focus { border-color: var(--orange); }
  .form-input::placeholder { color: var(--gray-300); }
  select.form-input { cursor: pointer; }
  textarea.form-input { resize: vertical; min-height: 100px; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .role-selector {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 20px;
  }
  .role-card {
    padding: 20px 16px;
    border: 2px solid var(--gray-200);
    border-radius: var(--radius);
    cursor: pointer;
    text-align: center;
    transition: all 0.15s;
  }
  .role-card.active { border-color: var(--orange); background: rgba(240,90,26,0.04); }
  .role-card:hover:not(.active) { border-color: var(--gray-300); }
  .role-card-icon { margin-bottom: 8px; color: var(--gray-500); }
  .role-card.active .role-card-icon { color: var(--orange); }
  .role-card-label {
    font-weight: 600;
    font-size: 14px;
    color: var(--gray-700);
  }
  .role-card.active .role-card-label { color: var(--orange); }

  /* ── APP SHELL ── */
  .app {
    min-height: 100vh;
    display: flex;
    background: var(--gray-50);
  }
  .sidebar {
    width: 260px;
    background: var(--black);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0; left: 0; bottom: 0;
    z-index: 50;
    transition: transform 0.3s ease;
  }
  .sidebar-logo {
    padding: 24px 20px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }
  .sidebar-nav {
    flex: 1;
    padding: 16px 12px;
    overflow-y: auto;
  }
  .nav-section-title {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--gray-500);
    padding: 8px 8px 6px;
    margin-top: 8px;
  }
  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--radius);
    cursor: pointer;
    color: var(--gray-300);
    font-size: 14px;
    font-weight: 500;
    transition: all 0.15s;
    margin-bottom: 2px;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
  }
  .nav-item:hover { color: white; background: rgba(255,255,255,0.06); }
  .nav-item.active { color: white; background: var(--orange); }
  .nav-badge {
    margin-left: auto;
    background: var(--orange);
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 1px 7px;
    border-radius: 100px;
    min-width: 20px;
    text-align: center;
  }
  .nav-item.active .nav-badge { background: white; color: var(--orange); }
  .sidebar-footer {
    padding: 16px 12px;
    border-top: 1px solid rgba(255,255,255,0.07);
  }
  .sidebar-user {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--radius);
    margin-bottom: 4px;
  }
  .avatar {
    width: 36px; height: 36px;
    border-radius: 50%;
    object-fit: cover;
    background: var(--orange);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 16px;
    color: white;
    flex-shrink: 0;
  }
  .avatar-lg {
    width: 80px; height: 80px;
    font-size: 32px;
    border-radius: 50%;
    background: var(--orange);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-weight: 800;
    color: white;
    flex-shrink: 0;
    overflow: hidden;
  }
  .sidebar-user-info { flex: 1; min-width: 0; }
  .sidebar-user-name {
    font-size: 13px;
    font-weight: 600;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sidebar-user-role {
    font-size: 11px;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* ── MAIN CONTENT ── */
  .main { margin-left: 260px; flex: 1; min-height: 100vh; }
  .topbar {
    background: white;
    border-bottom: 1px solid var(--gray-100);
    padding: 16px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 40;
  }
  .topbar-title {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .topbar-actions { display: flex; align-items: center; gap: 12px; }
  .content { padding: 32px; }

  /* ── CARDS ── */
  .card {
    background: white;
    border-radius: var(--radius-lg);
    padding: 24px;
    box-shadow: var(--shadow);
    border: 1px solid var(--gray-100);
  }
  .card-title {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 16px;
  }

  /* ── STATS ── */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }
  .stat-card {
    background: white;
    border-radius: var(--radius-lg);
    padding: 20px 24px;
    box-shadow: var(--shadow);
    border: 1px solid var(--gray-100);
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .stat-icon {
    width: 48px; height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .stat-icon-orange { background: rgba(240,90,26,0.1); color: var(--orange); }
  .stat-icon-military { background: rgba(74,92,58,0.1); color: var(--military); }
  .stat-icon-black { background: var(--gray-100); color: var(--gray-700); }
  .stat-value {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 900;
    line-height: 1;
    color: var(--black);
  }
  .stat-label {
    font-size: 12px;
    color: var(--gray-500);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 2px;
  }

  /* ── EVENT CARDS ── */
  .events-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }
  .event-card {
    background: white;
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow);
    border: 1px solid var(--gray-100);
    transition: box-shadow 0.2s, transform 0.2s;
    cursor: pointer;
  }
  .event-card:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px); }
  .event-card-header {
    height: 120px;
    background: var(--black);
    position: relative;
    display: flex;
    align-items: flex-end;
    padding: 16px;
    overflow: hidden;
  }
  .event-card-header::before {
    content: '';
    position: absolute;
    inset: 0;
    background: 
      radial-gradient(circle at 80% 20%, rgba(240,90,26,0.3), transparent 60%),
      radial-gradient(circle at 20% 80%, rgba(74,92,58,0.3), transparent 60%);
  }
  .event-card-header-content { position: relative; z-index: 1; width: 100%; }
  .event-modality-badge {
    display: inline-flex;
    align-items: center;
    background: rgba(255,255,255,0.15);
    color: white;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 100px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255,255,255,0.1);
  }
  .event-card-body { padding: 20px; }
  .event-card-title {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 800;
    text-transform: uppercase;
    margin-bottom: 12px;
    letter-spacing: 0.3px;
  }
  .event-meta {
    display: flex;
    flex-direction: column;
    gap: 7px;
    margin-bottom: 16px;
  }
  .event-meta-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--gray-500);
  }
  .event-meta-item svg { flex-shrink: 0; color: var(--gray-300); }
  .event-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 14px;
    border-top: 1px solid var(--gray-100);
  }
  .event-price {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 800;
    color: var(--orange);
  }
  .event-price-label { font-size: 11px; color: var(--gray-500); display: block; text-transform: uppercase; letter-spacing: 0.5px; }

  /* ── STATUS BADGES ── */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .badge-pending { background: rgba(245,158,11,0.1); color: #B45309; }
  .badge-confirmed { background: rgba(74,92,58,0.12); color: var(--military); }
  .badge-rejected { background: rgba(239,68,68,0.1); color: #DC2626; }
  .badge-paid { background: rgba(74,92,58,0.12); color: var(--military); }
  .badge-orange { background: rgba(240,90,26,0.1); color: var(--orange-dark); }

  /* ── TABLE ── */
  .table-wrap { overflow-x: auto; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  th {
    text-align: left;
    padding: 10px 16px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--gray-500);
    background: var(--gray-50);
    border-bottom: 1px solid var(--gray-100);
  }
  td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--gray-100);
    color: var(--gray-700);
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--gray-50); }

  /* ── NOTIFICATIONS ── */
  .notif-list { display: flex; flex-direction: column; gap: 8px; }
  .notif-item {
    display: flex;
    gap: 12px;
    padding: 14px 16px;
    border-radius: var(--radius);
    border: 1px solid var(--gray-100);
    background: white;
    transition: background 0.15s;
  }
  .notif-item.unread { background: rgba(240,90,26,0.04); border-color: rgba(240,90,26,0.15); }
  .notif-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--orange);
    flex-shrink: 0;
    margin-top: 4px;
  }
  .notif-text { font-size: 14px; color: var(--gray-700); flex: 1; line-height: 1.5; }
  .notif-date { font-size: 12px; color: var(--gray-300); white-space: nowrap; }

  /* ── PROFILE ── */
  .profile-header {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-bottom: 24px;
  }
  .profile-avatar-wrap { position: relative; }
  .avatar-upload-btn {
    position: absolute;
    bottom: 0; right: 0;
    width: 28px; height: 28px;
    border-radius: 50%;
    background: var(--orange);
    border: 2px solid white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: white;
  }

  /* ── MISC ── */
  .divider { height: 1px; background: var(--gray-100); margin: 20px 0; }
  .text-orange { color: var(--orange); }
  .text-military { color: var(--military); }
  .text-gray { color: var(--gray-500); }
  .text-sm { font-size: 13px; }
  .fw-600 { font-weight: 600; }
  .mt-16 { margin-top: 16px; }
  .mt-24 { margin-top: 24px; }
  .flex { display: flex; }
  .flex-center { display: flex; align-items: center; }
  .gap-8 { gap: 8px; }
  .gap-12 { gap: 12px; }
  .gap-16 { gap: 16px; }
  .mb-16 { margin-bottom: 16px; }
  .mb-24 { margin-bottom: 24px; }
  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--gray-500);
  }
  .empty-state-icon { margin: 0 auto 16px; color: var(--gray-200); }
  .empty-state-title { font-family: var(--font-display); font-size: 22px; font-weight: 800; text-transform: uppercase; color: var(--gray-300); margin-bottom: 8px; }
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .section-title {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .wa-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #25D366;
    color: white;
    padding: 10px 20px;
    border-radius: var(--radius);
    font-weight: 600;
    font-size: 14px;
    text-decoration: none;
    cursor: pointer;
    border: none;
    transition: background 0.15s;
  }
  .wa-link:hover { background: #1ebe57; }
  .tabs {
    display: flex;
    gap: 4px;
    background: var(--gray-100);
    border-radius: var(--radius);
    padding: 4px;
    margin-bottom: 24px;
  }
  .tab-btn {
    flex: 1;
    padding: 8px 16px;
    border: none;
    background: none;
    border-radius: 6px;
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    color: var(--gray-500);
    transition: all 0.15s;
  }
  .tab-btn.active {
    background: white;
    color: var(--black);
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  }
  .comment-box {
    background: var(--gray-50);
    border-radius: var(--radius);
    padding: 12px 14px;
    margin-bottom: 8px;
    border: 1px solid var(--gray-100);
  }
  .comment-author { font-size: 13px; font-weight: 600; color: var(--black); margin-bottom: 4px; }
  .comment-text { font-size: 14px; color: var(--gray-700); line-height: 1.5; }
  .comment-date { font-size: 11px; color: var(--gray-300); margin-top: 4px; }
  .progress-bar { height: 6px; background: var(--gray-100); border-radius: 3px; overflow: hidden; }
  .progress-fill { height: 100%; background: var(--orange); border-radius: 3px; transition: width 0.3s; }

  .profile-page { max-width: 760px; }
  .profile-cover {
    height: 180px;
    background: var(--black);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    position: relative;
    overflow: hidden;
  }
  .profile-cover::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 30% 60%, rgba(240,90,26,0.35), transparent 55%),
      radial-gradient(circle at 75% 30%, rgba(74,92,58,0.35), transparent 55%);
  }
  .profile-cover-pattern {
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 12px);
  }
  .profile-body {
    background: white;
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    border: 1px solid var(--gray-100);
    border-top: none;
    padding: 0 32px 32px;
  }
  .profile-avatar-section {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    transform: translateY(-48px);
    margin-bottom: -28px;
  }
  .profile-avatar-xl {
    width: 96px; height: 96px;
    border-radius: 50%;
    border: 4px solid white;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    background: var(--orange);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 36px;
    color: white;
    overflow: hidden;
    position: relative;
    cursor: pointer;
  }
  .profile-avatar-xl:hover .avatar-overlay { opacity: 1; }
  .avatar-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
    border-radius: 50%;
  }
  .profile-name-section { padding-top: 56px; margin-bottom: 28px; }
  .profile-display-name {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1;
  }
  .profile-role-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    padding: 4px 12px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .chip-organizer { background: rgba(240,90,26,0.1); color: var(--orange-dark); }
  .chip-athlete { background: rgba(74,92,58,0.12); color: var(--military); }
  .profile-section-title {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--gray-500);
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--gray-100);
  }
  .profile-info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 28px;
  }
  .profile-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .profile-save-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: var(--gray-50);
    border-radius: var(--radius);
    border: 1px solid var(--gray-100);
    margin-top: 24px;
  }
  .change-pw-section { margin-top: 28px; }

  /* ── HAMBURGER BUTTON ── */
  .hamburger {
    display: none;
    width: 40px; height: 40px;
    border-radius: var(--radius);
    border: 1.5px solid var(--gray-200);
    background: white;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    color: var(--black);
    flex-shrink: 0;
    transition: all 0.15s;
  }
  .hamburger:hover { background: var(--gray-100); }

  /* ── SIDEBAR OVERLAY (mobile backdrop) ── */
  .sidebar-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(2px);
    z-index: 49;
  }

  /* ── BOTTOM NAV (mobile) ── */
  .bottom-nav {
    display: none;
    position: fixed;
    bottom: 0; left: 0; right: 0;
    background: var(--black);
    border-top: 1px solid rgba(255,255,255,0.07);
    z-index: 50;
    padding: 0 4px;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .bottom-nav-inner {
    display: flex;
    align-items: stretch;
    justify-content: space-around;
    height: 60px;
  }
  .bottom-nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--gray-500);
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    padding: 8px 4px;
    border-radius: 8px;
    transition: color 0.15s;
    position: relative;
  }
  .bottom-nav-item.active { color: var(--orange); }
  .bottom-nav-item:hover { color: white; }
  .bottom-nav-badge {
    position: absolute;
    top: 6px;
    right: calc(50% - 18px);
    background: var(--orange);
    color: white;
    font-size: 9px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 100px;
    min-width: 16px;
    text-align: center;
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 768px) {
    .sidebar {
      transform: translateX(-260px);
      transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
      z-index: 50;
    }
    .sidebar.open { transform: translateX(0); }
    .sidebar-backdrop.open { display: block; }
    .main { margin-left: 0; }
    .topbar { padding: 12px 16px; }
    .content {
      padding: 16px;
      padding-bottom: 80px; /* room for bottom nav */
    }
    .hamburger { display: flex; }
    .bottom-nav { display: block; }
    .form-row { grid-template-columns: 1fr; }
    .events-grid { grid-template-columns: 1fr; }
    .stats-grid { grid-template-columns: 1fr 1fr; }
    .profile-info-grid { grid-template-columns: 1fr; }
    .profile-page { max-width: 100%; }
    .profile-body { padding: 0 16px 24px; }
    .profile-save-bar { flex-direction: column; gap: 12px; align-items: stretch; text-align: center; }
    .topbar-title { font-size: 20px; }
    .modal { padding: 24px 20px; }
    .modal-wide { max-width: 100%; margin: 0; border-radius: 0; min-height: 100vh; }
    .overlay { padding: 0; align-items: flex-end; }
    .modal-wide { border-radius: var(--radius-lg) var(--radius-lg) 0 0; min-height: 80vh; }
  }

  @media (min-width: 769px) {
    .sidebar { transform: translateX(0) !important; }
    .sidebar-backdrop { display: none !important; }
    .bottom-nav { display: none !important; }
    .hamburger { display: none !important; }
  }

  @media (max-width: 480px) {
    .stats-grid { grid-template-columns: 1fr; }
    .hero-btns { flex-direction: column; align-items: center; }
    .landing-nav { padding: 16px 20px; }
    .landing-hero { padding: 40px 20px; }
    .hero-title { font-size: 56px; }
    .event-card-footer { flex-wrap: wrap; gap: 8px; }
  }
`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmtDate = (d) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const fmtPrice = (v) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`;
const initials = (name) => name?.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function PlayGame() {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState("landing");
  const [modal, setModal] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [authTab, setAuthTab] = useState("login");
  const [notification, setNotification] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3200);
  };

  const unreadComments = events
    .filter(e => e.organizerId === currentUser?.id)
    .reduce((acc, e) => acc + e.comments.filter(c => !c.read).length, 0);

  // ── AUTH
  const handleLogin = (email, password) => {
    const u = users.find(u => u.email === email && u.password === password);
    if (!u) return notify("Email ou senha incorretos.", "error");
    setCurrentUser(u);
    setModal(null);
    setView("app");
    setActiveTab("dashboard");
    notify(`Bem-vindo, ${u.name.split(" ")[0]}! 🎉`);
  };

  const handleRegister = (data) => {
    if (users.find(u => u.email === data.email)) return notify("Email já cadastrado.", "error");
    const newUser = { ...data, id: `user_${Date.now()}`, avatar: null };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    setModal(null);
    setView("app");
    setActiveTab("dashboard");
    notify(`Conta criada com sucesso! 🎉`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView("landing");
    setActiveTab("dashboard");
  };

  // ── EVENTS
  const handleCreateEvent = (data) => {
    const ev = {
      ...data,
      id: Date.now(),
      organizerId: currentUser.id,
      status: "pending",
      registrations: [],
      comments: [],
      whatsappLink: data.whatsappLink || "",
    };
    setEvents(prev => [...prev, ev]);
    setModal(null);
    notify("Evento criado! Aguardando confirmação da arena.");
  };

  const handleEditEvent = (id, data) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
    setModal(null);
    notify("Evento atualizado!");
  };

  const handleDeleteEvent = (id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    setModal(null);
    notify("Evento excluído.");
  };

  const handleArenaAction = (eventId, action) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: action } : e));
    notify(action === "confirmed" ? "Evento confirmado!" : "Evento rejeitado.");
  };

  // ── ATHLETE
  const handleRegisterForEvent = (eventId) => {
    setEvents(prev => prev.map(e => {
      if (e.id !== eventId) return e;
      if (e.registrations.find(r => r.athleteId === currentUser.id)) {
        notify("Você já está inscrito!", "error"); return e;
      }
      notify("Inscrição realizada! Aguarde confirmação do organizador.");
      return { ...e, registrations: [...e.registrations, { athleteId: currentUser.id, partner: "", status: "pending", joinedAt: new Date().toISOString().split("T")[0] }] };
    }));
  };

  const handleLeaveEvent = (eventId) => {
    setEvents(prev => prev.map(e => e.id === eventId
      ? { ...e, registrations: e.registrations.filter(r => r.athleteId !== currentUser.id) }
      : e
    ));
    notify("Você saiu do evento.");
  };

  const handleConfirmAthlete = (eventId, athleteId) => {
    setEvents(prev => prev.map(e => e.id === eventId
      ? { ...e, registrations: e.registrations.map(r => r.athleteId === athleteId ? { ...r, status: "paid" } : r) }
      : e
    ));
    notify("Participação confirmada! Atleta receberá o link do WhatsApp.");
  };

  const handleAddComment = (eventId, text) => {
    setEvents(prev => prev.map(e => e.id === eventId
      ? { ...e, comments: [...e.comments, { athleteId: currentUser.id, text, date: new Date().toISOString().split("T")[0], read: false }] }
      : e
    ));
    notify("Comentário enviado!");
  };

  const handleMarkCommentsRead = (eventId) => {
    setEvents(prev => prev.map(e => e.id === eventId
      ? { ...e, comments: e.comments.map(c => ({ ...c, read: true })) }
      : e
    ));
  };

  const handleUpdateProfile = (data) => {
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, ...data } : u));
    setCurrentUser(prev => ({ ...prev, ...data }));
    setModal(null);
    notify("Perfil atualizado!");
  };

  const myEvents = currentUser?.role === "organizer"
    ? events.filter(e => e.organizerId === currentUser.id)
    : events.filter(e => e.registrations.find(r => r.athleteId === currentUser?.id));

  return (
    <>
      <style>{css}</style>

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: notification.type === "error" ? "#EF4444" : "#2E3B23",
          color: "white", padding: "12px 20px", borderRadius: 10,
          fontWeight: 600, fontSize: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          animation: "slideUp 0.2s ease", display: "flex", alignItems: "center", gap: 8
        }}>
          {notification.type === "error" ? "✕" : "✓"} {notification.msg}
        </div>
      )}

      {view === "landing" && (
        <Landing onLogin={() => { setAuthTab("login"); setModal("auth"); }} onRegister={() => { setAuthTab("register"); setModal("auth"); }} />
      )}

      {view === "app" && currentUser && (
        <div className="app">
          <Sidebar user={currentUser} activeTab={activeTab} setActiveTab={setActiveTab}
            onLogout={handleLogout} unreadComments={unreadComments}
            isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="main">
            <div className="topbar">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button className="hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Abrir menu">
                  <Icon d="M3 12h18M3 6h18M3 18h18" size={20} />
                </button>
                <div className="topbar-title">{tabTitle(activeTab)}</div>
              </div>
              <div className="topbar-actions">
                {currentUser.role === "organizer" && activeTab === "events" && (
                  <button className="btn btn-primary btn-sm" onClick={() => setModal("create-event")}>
                    <Icon d={Icons.plus} size={16} /> <span style={{ display: "inline" }}>Novo Evento</span>
                  </button>
                )}
                <div className="avatar" style={{ cursor: "pointer" }} onClick={() => setActiveTab("profile")}>
                  {currentUser.avatar
                    ? <img src={currentUser.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    : initials(currentUser.name)}
                </div>
              </div>
            </div>
            <div className="content">
              {activeTab === "dashboard" && (
                <Dashboard user={currentUser} events={events} myEvents={myEvents}
                  onEventClick={e => { setSelectedEvent(e); setModal("event-detail"); }} />
              )}
              {activeTab === "events" && (
                <EventsPanel user={currentUser} events={currentUser.role === "organizer" ? myEvents : events.filter(e => e.status === "confirmed")}
                  allUsers={users}
                  onEventClick={e => { setSelectedEvent(e); setModal("event-detail"); handleMarkCommentsRead(e.id); }}
                  onEdit={e => { setSelectedEvent(e); setModal("edit-event"); }}
                  onDelete={handleDeleteEvent}
                  onRegister={handleRegisterForEvent}
                  currentUser={currentUser} />
              )}
              {activeTab === "arena" && currentUser.role === "organizer" && (
                <ArenaPanel arenas={ARENAS} events={events} onArenaAction={handleArenaAction} />
              )}
              {activeTab === "notifications" && (
                <NotificationsPanel user={currentUser} events={events} allUsers={users}
                  onEventClick={e => { setSelectedEvent(e); setModal("event-detail"); handleMarkCommentsRead(e.id); }} />
              )}
              {activeTab === "profile" && (
                <ProfilePage user={currentUser} onSave={handleUpdateProfile} />
              )}
            </div>

            {/* ── BOTTOM NAV (mobile only) ── */}
            <BottomNav user={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} unreadComments={unreadComments} />
          </div>
        </div>
      )}

      {/* MODALS */}
      {modal === "auth" && (
        <AuthModal tab={authTab} setTab={setAuthTab} onLogin={handleLogin} onRegister={handleRegister} onClose={() => setModal(null)} />
      )}
      {modal === "create-event" && (
        <EventFormModal arenas={ARENAS} modalities={MODALITIES} onSubmit={handleCreateEvent} onClose={() => setModal(null)} />
      )}
      {modal === "edit-event" && selectedEvent && (
        <EventFormModal arenas={ARENAS} modalities={MODALITIES} event={selectedEvent}
          onSubmit={(data) => handleEditEvent(selectedEvent.id, data)} onClose={() => setModal(null)} />
      )}
      {modal === "event-detail" && selectedEvent && (
        <EventDetailModal
          event={events.find(e => e.id === selectedEvent.id) || selectedEvent}
          user={currentUser} allUsers={users} arenas={ARENAS}
          onClose={() => setModal(null)}
          onRegister={() => handleRegisterForEvent(selectedEvent.id)}
          onLeave={() => handleLeaveEvent(selectedEvent.id)}
          onConfirmAthlete={(aid) => handleConfirmAthlete(selectedEvent.id, aid)}
          onComment={(txt) => handleAddComment(selectedEvent.id, txt)}
          onArenaAction={(action) => handleArenaAction(selectedEvent.id, action)}
          onEdit={() => { setModal("edit-event"); }}
        />
      )}
    </>
  );
}



// ─── BOTTOM NAV (mobile) ─────────────────────────────────────────────────────
function BottomNav({ user, activeTab, setActiveTab, unreadComments }) {
  const isOrg = user.role === "organizer";
  const items = isOrg
    ? [
        { id: "dashboard", label: "Início", icon: Icons.home },
        { id: "events", label: "Eventos", icon: Icons.trophy },
        { id: "arena", label: "Arenas", icon: Icons.mapPin },
        { id: "notifications", label: "Notif.", icon: Icons.bell, badge: unreadComments },
        { id: "profile", label: "Perfil", icon: Icons.settings },
      ]
    : [
        { id: "dashboard", label: "Início", icon: Icons.home },
        { id: "events", label: "Eventos", icon: Icons.trophy },
        { id: "notifications", label: "Inscrições", icon: Icons.award },
        { id: "profile", label: "Perfil", icon: Icons.settings },
      ];
  return (
    <div className="bottom-nav">
      <div className="bottom-nav-inner">
        {items.map(item => (
          <button key={item.id} className={`bottom-nav-item ${activeTab === item.id ? "active" : ""}`} onClick={() => setActiveTab(item.id)}>
            {item.badge > 0 && <span className="bottom-nav-badge">{item.badge}</span>}
            <Icon d={item.icon} size={20} />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function Landing({ onLogin, onRegister }) {
  const features = [
    { icon: Icons.trophy, title: "Organize Torneios", desc: "Crie e gerencie eventos esportivos completos com inscrições e pagamentos." },
    { icon: Icons.users, title: "Conecte Atletas", desc: "Plataforma dedicada para atletas se inscreverem e acompanharem eventos." },
    { icon: Icons.shield, title: "Arenas Parceiras", desc: "Vincule eventos a arenas cadastradas com processo de confirmação oficial." },
    { icon: Icons.star, title: "14 Modalidades", desc: "Vôlei, Futevôlei e Beach Tennis nas versões masculino, feminino e misto." },
  ];
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="logo">
          <div className="logo-icon">PG</div>
          <div className="logo-text">Play<span>Game</span></div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-secondary" onClick={onLogin}>Entrar</button>
          <button className="btn btn-primary" onClick={onRegister}>Cadastrar</button>
        </div>
      </nav>
      <div className="landing-hero">
        <div className="hero-badge">
          <Icon d={Icons.star} size={12} fill="#F05A1A" color="none" /> Plataforma Esportiva N°1
        </div>
        <h1 className="hero-title">
          Play<br /><span>Game</span>
        </h1>
        <p className="hero-sub">
          A plataforma completa para organização de torneios de Beach Tennis, Vôlei e Futevôlei.
        </p>
        <div className="hero-btns">
          <button className="btn btn-primary" onClick={onRegister} style={{ padding: "14px 36px", fontSize: 16 }}>
            Começar Agora
          </button>
          <button className="btn btn-secondary" onClick={onLogin} style={{ padding: "14px 36px", fontSize: 16 }}>
            Já tenho conta
          </button>
        </div>
      </div>
      <div style={{ background: "rgba(255,255,255,0.03)", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "48px", position: "relative", zIndex: 2 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32 }}>
          {features.map((f, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: i % 2 === 0 ? "rgba(240,90,26,0.15)" : "rgba(74,92,58,0.2)", margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", color: i % 2 === 0 ? "#F05A1A" : "#6B7F57" }}>
                <Icon d={f.icon} size={24} />
              </div>
              <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 18, fontWeight: 800, color: "white", textTransform: "uppercase", marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "#6B6B70", lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 40, color: "#3A3A3E", fontSize: 13 }}>
          © 2026 PlayGame. Demo — org@demo.com / 123 · atleta@demo.com / 123
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ user, activeTab, setActiveTab, onLogout, unreadComments, isOpen, onClose }) {
  const orgNavItems = [
    { id: "dashboard", label: "Dashboard", icon: Icons.home },
    { id: "events", label: "Meus Eventos", icon: Icons.trophy },
    { id: "arena", label: "Arenas", icon: Icons.mapPin },
    { id: "notifications", label: "Notificações", icon: Icons.bell, badge: unreadComments },
  ];
  const athNavItems = [
    { id: "dashboard", label: "Dashboard", icon: Icons.home },
    { id: "events", label: "Explorar Eventos", icon: Icons.trophy },
    { id: "notifications", label: "Minhas Inscrições", icon: Icons.award },
  ];
  const nav = user.role === "organizer" ? orgNavItems : athNavItems;

  const handleNav = (id) => { setActiveTab(id); onClose(); };

  return (
    <>
      {/* Mobile backdrop */}
      <div className={`sidebar-backdrop ${isOpen ? "open" : ""}`} onClick={onClose} />

      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-logo" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="logo">
            <div className="logo-icon">PG</div>
            <div className="logo-text" style={{ fontSize: 20 }}>Play<span style={{ color: "#F05A1A" }}>Game</span></div>
          </div>
          {/* Close button — only visible on mobile */}
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--gray-500)", cursor: "pointer", padding: 4, display: "flex" }}
            className="hamburger" aria-label="Fechar menu">
            <Icon d={Icons.x} size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-title">Menu</div>
          {nav.map(item => (
            <button key={item.id} className={`nav-item ${activeTab === item.id ? "active" : ""}`} onClick={() => handleNav(item.id)}>
              <Icon d={item.icon} size={18} />
              {item.label}
              {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
          <div className="nav-section-title" style={{ marginTop: 16 }}>Conta</div>
          <button className={`nav-item ${activeTab === "profile" ? "active" : ""}`} onClick={() => handleNav("profile")}>
            <Icon d={Icons.settings} size={18} /> Meu Perfil
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user" style={{ cursor: "pointer" }} onClick={() => handleNav("profile")}>
            <div className="avatar">
              {user.avatar ? <img src={user.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : initials(user.name)}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{user.role === "organizer" ? "Organizador" : "Atleta"}</div>
            </div>
          </div>
          <button className="nav-item" onClick={onLogout}>
            <Icon d={Icons.logout} size={18} /> Sair
          </button>
        </div>
      </div>
    </>
  );
}

function tabTitle(tab) {
  const map = { dashboard: "Dashboard", events: "Eventos", arena: "Arenas", notifications: "Notificações", myregistrations: "Minhas Inscrições", profile: "Meu Perfil" };
  return map[tab] || tab;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ user, events, myEvents, onEventClick }) {
  const isOrg = user.role === "organizer";
  const confirmedEvents = events.filter(e => e.status === "confirmed").length;
  const pendingEvents = events.filter(e => e.status === "pending").length;
  const totalAthletes = events.reduce((a, e) => a + e.registrations.length, 0);
  const myRegistrations = isOrg ? 0 : myEvents.length;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 900, textTransform: "uppercase" }}>
          Olá, {user.name.split(" ")[0]}! 👋
        </h2>
        <p style={{ color: "var(--gray-500)", marginTop: 4 }}>Aqui está seu resumo de hoje.</p>
      </div>

      <div className="stats-grid">
        {isOrg ? (
          <>
            <StatCard icon={Icons.trophy} label="Meus Eventos" value={myEvents.length} color="orange" />
            <StatCard icon={Icons.check} label="Confirmados" value={myEvents.filter(e => e.status === "confirmed").length} color="military" />
            <StatCard icon={Icons.users} label="Inscrições" value={myEvents.reduce((a, e) => a + e.registrations.length, 0)} color="black" />
            <StatCard icon={Icons.bell} label="Pendentes Arena" value={myEvents.filter(e => e.status === "pending").length} color="orange" />
          </>
        ) : (
          <>
            <StatCard icon={Icons.award} label="Minhas Inscrições" value={myRegistrations} color="orange" />
            <StatCard icon={Icons.check} label="Eventos Disponíveis" value={confirmedEvents} color="military" />
            <StatCard icon={Icons.users} label="Atletas na Plataforma" value={totalAthletes} color="black" />
            <StatCard icon={Icons.trophy} label="Em Andamento" value={pendingEvents} color="orange" />
          </>
        )}
      </div>

      <div className="section-header">
        <div className="section-title">Eventos Recentes</div>
      </div>
      {myEvents.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Icon d={Icons.trophy} size={48} /></div>
            <div className="empty-state-title">{isOrg ? "Nenhum evento criado" : "Nenhuma inscrição"}</div>
            <p style={{ color: "var(--gray-300)", fontSize: 14 }}>
              {isOrg ? "Crie seu primeiro evento para começar." : "Explore os eventos disponíveis e se inscreva!"}
            </p>
          </div>
        </div>
      ) : (
        <div className="events-grid">
          {myEvents.slice(0, 4).map(e => <EventCard key={e.id} event={e} onClick={() => onEventClick(e)} showActions={false} />)}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon stat-icon-${color}`}><Icon d={icon} size={24} /></div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

// ─── EVENTS PANEL ─────────────────────────────────────────────────────────────
function EventsPanel({ user, events, allUsers, onEventClick, onEdit, onDelete, onRegister, currentUser }) {
  const isOrg = user.role === "organizer";
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? events : events.filter(e => e.modality.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {["all", "Beach Tennis", "Vôlei", "Futevôlei"].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-ghost"}`} onClick={() => setFilter(f)}>
            {f === "all" ? "Todos" : f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-state-icon"><Icon d={Icons.trophy} size={48} /></div>
          <div className="empty-state-title">Nenhum evento encontrado</div>
        </div></div>
      ) : (
        <div className="events-grid">
          {filtered.map(e => (
            <EventCard key={e.id} event={e} onClick={() => onEventClick(e)} showActions={isOrg}
              onEdit={() => onEdit(e)} onDelete={() => onDelete(e.id)}
              currentUser={currentUser} onRegister={() => onRegister(e.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event, onClick, showActions, onEdit, onDelete, currentUser, onRegister }) {
  const arena = ARENAS.find(a => a.id === event.arenaId);
  const isRegistered = currentUser && event.registrations.find(r => r.athleteId === currentUser.id);
  const pct = Math.round((event.registrations.length / event.maxTeams) * 100);

  return (
    <div className="event-card">
      <div className="event-card-header" onClick={onClick}>
        <div className="event-card-header-content">
          <span className="event-modality-badge">{event.modality}</span>
        </div>
      </div>
      <div className="event-card-body" onClick={onClick}>
        <div className="event-card-title">{event.name}</div>
        <div className="event-meta">
          <div className="event-meta-item"><Icon d={Icons.calendar} size={14} />{fmtDate(event.date)}</div>
          <div className="event-meta-item"><Icon d={Icons.mapPin} size={14} />{arena?.name || "–"}</div>
          <div className="event-meta-item"><Icon d={Icons.users} size={14} />{event.registrations.length} / {event.maxTeams} times</div>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        <div style={{ fontSize: 11, color: "var(--gray-300)", marginTop: 4, textAlign: "right" }}>{pct}% preenchido</div>
      </div>
      <div className="event-card-footer" style={{ padding: "14px 20px 16px" }}>
        <div>
          <span className="event-price-label">Inscrição</span>
          <span className="event-price">{fmtPrice(event.price)}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <StatusBadge status={event.status} />
          {showActions && (
            <>
              <button className="btn btn-ghost btn-xs" onClick={e => { e.stopPropagation(); onEdit(); }}><Icon d={Icons.edit} size={13} /></button>
              <button className="btn btn-danger btn-xs" onClick={e => { e.stopPropagation(); onDelete(); }}><Icon d={Icons.trash} size={13} /></button>
            </>
          )}
          {!showActions && currentUser?.role === "athlete" && (
            isRegistered
              ? <span className="badge badge-confirmed">Inscrito</span>
              : event.status === "confirmed" && <button className="btn btn-primary btn-xs" onClick={e => { e.stopPropagation(); onRegister(); }}>Inscrever</button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === "confirmed") return <span className="badge badge-confirmed">✓ Confirmado</span>;
  if (status === "pending") return <span className="badge badge-pending">⏳ Pendente</span>;
  if (status === "rejected") return <span className="badge badge-rejected">✕ Rejeitado</span>;
  return null;
}

// ─── ARENA PANEL ──────────────────────────────────────────────────────────────
function ArenaPanel({ arenas, events, onArenaAction }) {
  return (
    <div>
      <div className="section-header">
        <div className="section-title">Arenas Cadastradas</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
        {arenas.map(a => (
          <div key={a.id} className="card" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(74,92,58,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--military)", flexShrink: 0 }}>
              <Icon d={Icons.mapPin} size={24} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, textTransform: "uppercase" }}>{a.name}</div>
              <div style={{ color: "var(--gray-500)", fontSize: 13, marginTop: 2 }}>{a.city} · {a.courts} quadras</div>
              <div style={{ color: "var(--gray-300)", fontSize: 12, marginTop: 4 }}>{a.contact}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="section-header">
        <div className="section-title">Eventos Aguardando Confirmação</div>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Evento</th><th>Arena</th><th>Data</th><th>Status</th><th>Ação</th></tr></thead>
            <tbody>
              {events.map(e => {
                const arena = arenas.find(a => a.id === e.arenaId);
                return (
                  <tr key={e.id}>
                    <td><span style={{ fontWeight: 600 }}>{e.name}</span><br /><span style={{ fontSize: 12, color: "var(--gray-300)" }}>{e.modality}</span></td>
                    <td>{arena?.name || "–"}</td>
                    <td>{fmtDate(e.date)}</td>
                    <td><StatusBadge status={e.status} /></td>
                    <td>
                      {e.status === "pending" && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-military btn-xs" onClick={() => onArenaAction(e.id, "confirmed")}>Confirmar</button>
                          <button className="btn btn-danger btn-xs" onClick={() => onArenaAction(e.id, "rejected")}>Rejeitar</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── NOTIFICATIONS PANEL ──────────────────────────────────────────────────────
function NotificationsPanel({ user, events, allUsers, onEventClick }) {
  const isOrg = user.role === "organizer";

  if (isOrg) {
    const myEvents = events.filter(e => e.organizerId === user.id);
    const allComments = myEvents.flatMap(e => e.comments.map(c => ({
      ...c, eventName: e.name, event: e,
      author: allUsers.find(u => u.id === c.athleteId)?.name || "Atleta"
    }))).sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
      <div>
        <div className="section-title" style={{ marginBottom: 20 }}>Comentários e Dúvidas</div>
        {allComments.length === 0 ? (
          <div className="card"><div className="empty-state">
            <div className="empty-state-icon"><Icon d={Icons.message} size={48} /></div>
            <div className="empty-state-title">Nenhuma mensagem</div>
          </div></div>
        ) : (
          <div className="notif-list">
            {allComments.map((c, i) => (
              <div key={i} className={`notif-item ${!c.read ? "unread" : ""}`} onClick={() => onEventClick(c.event)} style={{ cursor: "pointer" }}>
                {!c.read && <div className="notif-dot" />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--orange)", marginBottom: 4 }}>{c.eventName}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--black)" }}>{c.author}</div>
                  <div className="notif-text">{c.text}</div>
                </div>
                <div className="notif-date">{fmtDate(c.date)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Athlete view
  const myRegs = events.flatMap(e => e.registrations.filter(r => r.athleteId === user.id).map(r => ({ ...r, event: e })));
  return (
    <div>
      <div className="section-title" style={{ marginBottom: 20 }}>Minhas Inscrições</div>
      {myRegs.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-state-icon"><Icon d={Icons.award} size={48} /></div>
          <div className="empty-state-title">Nenhuma inscrição</div>
        </div></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {myRegs.map((r, i) => {
            const arena = ARENAS.find(a => a.id === r.event.arenaId);
            return (
              <div key={i} className="card" style={{ display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }} onClick={() => onEventClick(r.event)}>
                <div style={{ width: 56, height: 56, borderRadius: 12, background: "var(--black)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--orange)", flexShrink: 0 }}>
                  <Icon d={Icons.trophy} size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, textTransform: "uppercase" }}>{r.event.name}</div>
                  <div style={{ color: "var(--gray-500)", fontSize: 13 }}>{r.event.modality} · {arena?.name} · {fmtDate(r.event.date)}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <StatusBadge status={r.status} />
                  {r.status === "paid" && r.event.whatsappLink && (
                    <a href={r.event.whatsappLink} target="_blank" rel="noreferrer" className="wa-link" style={{ fontSize: 12, padding: "5px 12px" }} onClick={e => e.stopPropagation()}>
                      <Icon d={Icons.whatsapp} size={14} fill="white" color="none" /> WhatsApp
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── EVENT DETAIL MODAL ───────────────────────────────────────────────────────
function EventDetailModal({ event, user, allUsers, arenas, onClose, onRegister, onLeave, onConfirmAthlete, onComment, onArenaAction, onEdit }) {
  const [commentText, setCommentText] = useState("");
  const [detailTab, setDetailTab] = useState("info");
  const isOrg = user.role === "organizer" && event.organizerId === user.id;
  const myReg = event.registrations.find(r => r.athleteId === user.id);
  const arena = arenas.find(a => a.id === event.arenaId);
  const pct = Math.round((event.registrations.length / event.maxTeams) * 100);

  const sendComment = () => {
    if (!commentText.trim()) return;
    onComment(commentText);
    setCommentText("");
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{event.name}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <span className="badge badge-orange">{event.modality}</span>
              <StatusBadge status={event.status} />
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><Icon d={Icons.x} size={16} /></button>
        </div>

        <div className="tabs">
          {["info", "inscricoes", "comentarios"].map(t => (
            <button key={t} className={`tab-btn ${detailTab === t ? "active" : ""}`} onClick={() => setDetailTab(t)}>
              {t === "info" ? "Informações" : t === "inscricoes" ? "Inscrições" : "Comentários"}
              {t === "comentarios" && event.comments.filter(c => !c.read).length > 0 && (
                <span style={{ marginLeft: 6, background: "var(--orange)", color: "white", borderRadius: 10, padding: "1px 6px", fontSize: 11 }}>
                  {event.comments.filter(c => !c.read).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {detailTab === "info" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <InfoItem icon={Icons.calendar} label="Data" value={fmtDate(event.date)} />
              <InfoItem icon={Icons.mapPin} label="Arena" value={arena?.name || "–"} />
              <InfoItem icon={Icons.users} label="Vagas" value={`${event.registrations.length} / ${event.maxTeams}`} />
              <InfoItem icon={Icons.trophy} label="Inscrição" value={fmtPrice(event.price)} />
            </div>
            <div className="progress-bar" style={{ marginBottom: 4 }}><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
            <div style={{ fontSize: 12, color: "var(--gray-300)", textAlign: "right", marginBottom: 16 }}>{pct}% preenchido</div>

            <div style={{ background: "var(--gray-50)", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Regras</div>
              <div style={{ fontSize: 14, color: "var(--gray-700)", lineHeight: 1.6 }}>{event.rules || "Sem regras cadastradas."}</div>
            </div>

            {isOrg && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-ghost btn-sm" onClick={onEdit}><Icon d={Icons.edit} size={15} /> Editar</button>
                {event.status === "pending" && (
                  <>
                    <button className="btn btn-military btn-sm" onClick={() => onArenaAction("confirmed")}>Simular: Arena Confirma</button>
                    <button className="btn btn-danger btn-sm" onClick={() => onArenaAction("rejected")}>Simular: Arena Rejeita</button>
                  </>
                )}
              </div>
            )}

            {user.role === "athlete" && (
              <div style={{ marginTop: 16 }}>
                {myReg ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 16px", background: "rgba(74,92,58,0.08)", borderRadius: "var(--radius)", border: "1px solid rgba(74,92,58,0.2)" }}>
                      <Icon d={Icons.check} size={18} color="var(--military)" />
                      <span style={{ color: "var(--military)", fontWeight: 600, fontSize: 14 }}>
                        {myReg.status === "paid" ? "Participação confirmada! 🎉" : "Inscrito — aguardando confirmação"}
                      </span>
                    </div>
                    {myReg.status === "paid" && event.whatsappLink && (
                      <a href={event.whatsappLink} target="_blank" rel="noreferrer" className="wa-link">
                        <Icon d={Icons.whatsapp} size={18} fill="white" color="none" /> Entrar no Grupo WhatsApp
                      </a>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={onLeave}>Sair do Evento</button>
                  </div>
                ) : event.status === "confirmed" ? (
                  <button className="btn btn-primary" onClick={onRegister} style={{ width: "100%" }}>
                    Inscrever-se · {fmtPrice(event.price)}
                  </button>
                ) : (
                  <div style={{ color: "var(--gray-300)", fontSize: 14, textAlign: "center", padding: "12px" }}>Evento não disponível para inscrições.</div>
                )}
              </div>
            )}
          </div>
        )}

        {detailTab === "inscricoes" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 600 }}>{event.registrations.length} inscrições</div>
              <span className="badge badge-orange">{event.registrations.filter(r => r.status === "paid").length} confirmados</span>
            </div>
            {event.registrations.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--gray-300)", padding: 32 }}>Nenhum inscrito ainda.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Atleta</th><th>Dupla/Equipe</th><th>Data</th><th>Status</th>{isOrg && <th>Ação</th>}</tr></thead>
                  <tbody>
                    {event.registrations.map((r, i) => {
                      const athlete = allUsers.find(u => u.id === r.athleteId);
                      return (
                        <tr key={i}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>{initials(athlete?.name || "?")}</div>
                              {athlete?.name || r.athleteId}
                            </div>
                          </td>
                          <td>{r.partner || "—"}</td>
                          <td>{fmtDate(r.joinedAt)}</td>
                          <td>{r.status === "paid" ? <span className="badge badge-paid">Pago</span> : <span className="badge badge-pending">Pendente</span>}</td>
                          {isOrg && (
                            <td>
                              {r.status === "pending" && (
                                <button className="btn btn-military btn-xs" onClick={() => onConfirmAthlete(r.athleteId)}>Confirmar</button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {detailTab === "comentarios" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              {event.comments.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--gray-300)", padding: 24 }}>Nenhum comentário.</div>
              ) : event.comments.map((c, i) => {
                const author = allUsers.find(u => u.id === c.athleteId);
                return (
                  <div key={i} className="comment-box">
                    <div className="comment-author">{author?.name || "Atleta"}</div>
                    <div className="comment-text">{c.text}</div>
                    <div className="comment-date">{fmtDate(c.date)}</div>
                  </div>
                );
              })}
            </div>
            {user.role === "athlete" && (
              <div style={{ display: "flex", gap: 8 }}>
                <input className="form-input" value={commentText} onChange={e => setCommentText(e.target.value)}
                  placeholder="Escreva sua dúvida ou comentário..." style={{ flex: 1 }}
                  onKeyDown={e => e.key === "Enter" && sendComment()} />
                <button className="btn btn-primary btn-sm" onClick={sendComment}>Enviar</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gray-500)", flexShrink: 0 }}>
        <Icon d={icon} size={18} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "var(--gray-300)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--black)", marginTop: 1 }}>{value}</div>
      </div>
    </div>
  );
}

// ─── EVENT FORM MODAL ─────────────────────────────────────────────────────────
function EventFormModal({ arenas, modalities, event, onSubmit, onClose }) {
  const [form, setForm] = useState({
    name: event?.name || "",
    modality: event?.modality || modalities[0],
    arenaId: event?.arenaId || arenas[0].id,
    date: event?.date || "",
    rules: event?.rules || "",
    price: event?.price || "",
    maxTeams: event?.maxTeams || "",
    whatsappLink: event?.whatsappLink || "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.name || !form.date || !form.price || !form.maxTeams) return alert("Preencha todos os campos obrigatórios.");
    onSubmit({ ...form, arenaId: Number(form.arenaId), price: Number(form.price), maxTeams: Number(form.maxTeams) });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{event ? "Editar Evento" : "Novo Evento"}</div>
          <button className="modal-close" onClick={onClose}><Icon d={Icons.x} size={16} /></button>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Nome do Evento *</label>
            <input className="form-input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Ex: Open de Beach Tennis SP" /></div>
          <div className="form-group"><label className="form-label">Data *</label>
            <input className="form-input" type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Modalidade *</label>
            <select className="form-input" value={form.modality} onChange={e => set("modality", e.target.value)}>
              {modalities.map(m => <option key={m}>{m}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Arena *</label>
            <select className="form-input" value={form.arenaId} onChange={e => set("arenaId", e.target.value)}>
              {arenas.map(a => <option key={a.id} value={a.id}>{a.name} — {a.city}</option>)}</select></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Valor da Inscrição (R$) *</label>
            <input className="form-input" type="number" value={form.price} onChange={e => set("price", e.target.value)} placeholder="120" /></div>
          <div className="form-group"><label className="form-label">Limite de Times *</label>
            <input className="form-input" type="number" value={form.maxTeams} onChange={e => set("maxTeams", e.target.value)} placeholder="32" /></div>
        </div>
        <div className="form-group"><label className="form-label">Regras</label>
          <textarea className="form-input" value={form.rules} onChange={e => set("rules", e.target.value)} placeholder="Descreva as regras do torneio..." /></div>
        <div className="form-group"><label className="form-label">Link do Grupo WhatsApp</label>
          <input className="form-input" value={form.whatsappLink} onChange={e => set("whatsappLink", e.target.value)} placeholder="https://chat.whatsapp.com/..." /></div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit}>{event ? "Salvar Alterações" : "Criar Evento"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── AUTH MODAL ───────────────────────────────────────────────────────────────
function AuthModal({ tab, setTab, onLogin, onRegister, onClose }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "athlete", cpf: "", phone: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{tab === "login" ? "Entrar" : "Cadastrar"}</div>
          <button className="modal-close" onClick={onClose}><Icon d={Icons.x} size={16} /></button>
        </div>

        <div className="tabs" style={{ marginBottom: 24 }}>
          <button className={`tab-btn ${tab === "login" ? "active" : ""}`} onClick={() => setTab("login")}>Entrar</button>
          <button className={`tab-btn ${tab === "register" ? "active" : ""}`} onClick={() => setTab("register")}>Cadastrar</button>
        </div>

        {tab === "register" && (
          <>
            <div className="role-selector">
              <div className={`role-card ${form.role === "athlete" ? "active" : ""}`} onClick={() => set("role", "athlete")}>
                <div className="role-card-icon"><Icon d={Icons.award} size={28} /></div>
                <div className="role-card-label">Atleta</div>
              </div>
              <div className={`role-card ${form.role === "organizer" ? "active" : ""}`} onClick={() => set("role", "organizer")}>
                <div className="role-card-icon"><Icon d={Icons.shield} size={28} /></div>
                <div className="role-card-label">Organizador</div>
              </div>
            </div>
            <div className="form-group"><label className="form-label">Nome Completo</label>
              <input className="form-input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Seu nome" /></div>
          </>
        )}

        <div className="form-group"><label className="form-label">Email</label>
          <input className="form-input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="seu@email.com" /></div>
        <div className="form-group"><label className="form-label">Senha</label>
          <input className="form-input" type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="••••••••" /></div>

        {tab === "register" && form.role === "athlete" && (
          <div className="form-row">
            <div className="form-group"><label className="form-label">CPF</label>
              <input className="form-input" value={form.cpf} onChange={e => set("cpf", e.target.value)} placeholder="000.000.000-00" /></div>
            <div className="form-group"><label className="form-label">Telefone</label>
              <input className="form-input" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="(11) 99999-0000" /></div>
          </div>
        )}

        <button className="btn btn-primary" style={{ width: "100%", padding: "13px", fontSize: 15, marginTop: 4 }}
          onClick={() => tab === "login" ? onLogin(form.email, form.password) : onRegister(form)}>
          {tab === "login" ? "Entrar" : "Criar Conta"}
        </button>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--gray-500)" }}>
          Demo: <strong>org@demo.com</strong> / <strong>atleta@demo.com</strong> — senha: <strong>123</strong>
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
function ProfilePage({ user, onSave }) {
  const [form, setForm] = useState({
    name: user.name, email: user.email,
    phone: user.phone || "", cpf: user.cpf || "",
    bio: user.bio || "", city: user.city || "",
    avatar: user.avatar || null,
  });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [saved, setSaved] = useState(false);
  const [editingPw, setEditingPw] = useState(false);
  const fileRef = useRef();
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false); };

  const handleImg = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("avatar", ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePwSave = () => {
    setPwError("");
    if (pwForm.current !== user.password) return setPwError("Senha atual incorreta.");
    if (pwForm.next.length < 4) return setPwError("Nova senha deve ter pelo menos 4 caracteres.");
    if (pwForm.next !== pwForm.confirm) return setPwError("As senhas não coincidem.");
    onSave({ password: pwForm.next });
    setPwForm({ current: "", next: "", confirm: "" });
    setEditingPw(false);
  };

  const isOrg = user.role === "organizer";

  return (
    <div className="profile-page">
      {/* Cover + Avatar */}
      <div className="profile-cover">
        <div className="profile-cover-pattern" />
      </div>
      <div className="profile-body">
        <div className="profile-avatar-section">
          <div className="profile-avatar-xl" onClick={() => fileRef.current.click()}>
            {form.avatar
              ? <img src={form.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : initials(form.name)}
            <div className="avatar-overlay">
              <Icon d={Icons.camera} size={22} color="white" />
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImg} />
          <div style={{ display: "flex", gap: 8, paddingBottom: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current.click()}>
              <Icon d={Icons.camera} size={15} /> Trocar foto
            </button>
            {form.avatar && (
              <button className="btn btn-ghost btn-sm" onClick={() => set("avatar", null)}>Remover</button>
            )}
          </div>
        </div>

        <div className="profile-name-section">
          <div className="profile-display-name">{form.name || "Seu Nome"}</div>
          <span className={`profile-role-chip ${isOrg ? "chip-organizer" : "chip-athlete"}`}>
            <Icon d={isOrg ? Icons.shield : Icons.award} size={12} />
            {isOrg ? "Organizador" : "Atleta"}
          </span>
        </div>

        {/* Dados pessoais */}
        <div className="profile-section-title">Dados Pessoais</div>
        <div className="profile-info-grid">
          <div className="profile-field">
            <label className="form-label">Nome Completo</label>
            <input className="form-input" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div className="profile-field">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
          </div>
          <div className="profile-field">
            <label className="form-label">Cidade</label>
            <input className="form-input" value={form.city} onChange={e => set("city", e.target.value)} placeholder="Ex: São Paulo" />
          </div>
          <div className="profile-field">
            <label className="form-label">Telefone / WhatsApp</label>
            <input className="form-input" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="(11) 99999-0000" />
          </div>
          {!isOrg && (
            <div className="profile-field">
              <label className="form-label">CPF</label>
              <input className="form-input" value={form.cpf} onChange={e => set("cpf", e.target.value)} placeholder="000.000.000-00" />
            </div>
          )}
        </div>

        <div className="profile-field" style={{ marginBottom: 8 }}>
          <label className="form-label">Bio / Apresentação</label>
          <textarea className="form-input" value={form.bio} onChange={e => set("bio", e.target.value)}
            placeholder={isOrg ? "Fale um pouco sobre você como organizador..." : "Posições, nível, modalidades favoritas..."}
            style={{ minHeight: 90 }} />
        </div>

        <div className="profile-save-bar">
          <span style={{ fontSize: 13, color: "var(--gray-500)" }}>
            {saved ? <span style={{ color: "var(--military)", fontWeight: 600 }}>✓ Alterações salvas!</span> : "Salve para aplicar as alterações."}
          </span>
          <button className="btn btn-primary" onClick={handleSave}>Salvar Perfil</button>
        </div>

        {/* Segurança */}
        <div className="change-pw-section">
          <div className="profile-section-title">Segurança</div>
          {!editingPw ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "var(--gray-50)", borderRadius: "var(--radius)", border: "1px solid var(--gray-100)" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Senha de acesso</div>
                <div style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 2 }}>Última alteração: não registrada</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingPw(true)}>Alterar senha</button>
            </div>
          ) : (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, textTransform: "uppercase", marginBottom: 16 }}>Alterar Senha</div>
              <div className="form-group">
                <label className="form-label">Senha atual</label>
                <input className="form-input" type="password" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} placeholder="••••••••" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nova senha</label>
                  <input className="form-input" type="password" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmar senha</label>
                  <input className="form-input" type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} placeholder="••••••••" />
                </div>
              </div>
              {pwError && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 12 }}>{pwError}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditingPw(false); setPwError(""); }}>Cancelar</button>
                <button className="btn btn-primary btn-sm" onClick={handlePwSave}>Salvar Senha</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE MODAL (kept for legacy, unused) ─────────────────────────────────
function ProfileModal({ user, onSave, onClose }) {
  return null;
}
