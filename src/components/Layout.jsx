import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BadgeDollarSign,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Home,
  LogOut,
  Menu,
  Newspaper,
  PawPrint,
  Scale,
  ScrollText,
  Users,
  DatabaseBackup,
  Inbox,
  Calculator,
  FileCheck2,
  X
} from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { PERFIS } from '../lib/permissions';

const items = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/associados', label: 'Associados', icon: Users },
  { to: '/animais', label: 'Animais / RGA', icon: PawPrint },
  { to: '/financeiro', label: 'Financeiro', icon: BadgeDollarSign },
  { to: '/planejamento-financeiro', label: 'Planejamento Financeiro', icon: Calculator },
  { to: '/prestacao-contas', label: 'Prestação de Contas', icon: FileCheck2 },
  { to: '/mensalidades', label: 'Mensalidades', icon: CalendarDays },
  { to: '/documentos', label: 'Documentos e Processos', icon: FileText },
  { to: '/noticias', label: 'Notícias', icon: Newspaper },
  { to: '/conselho-fiscal', label: 'Conselho Fiscal', icon: Scale },
  { to: '/relatorios', label: 'Relatórios', icon: ScrollText },
  { to: '/usuarios', label: 'Usuários', icon: ClipboardCheck },
  { to: '/backup', label: 'Backup', icon: DatabaseBackup },
  { to: '/formularios-site', label: 'Formulários do Site', icon: Inbox },
];

export default function Layout({ session, profile }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function logout() {
    await supabase?.auth.signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-screen lg:flex">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/85 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo AAC" className="h-11 w-11 rounded-2xl object-contain" />
            <div>
              <p className="text-sm font-black text-floresta">Painel AAC</p>
              <p className="text-xs text-slate-500">Diretoria e Conselho</p>
            </div>
          </Link>
          <button className="rounded-2xl bg-creme p-3 text-floresta" onClick={() => setOpen(!open)} aria-label="Abrir menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <aside className={`${open ? 'block' : 'hidden'} fixed inset-x-4 top-20 z-40 rounded-3xl bg-white p-4 shadow-premium lg:sticky lg:top-0 lg:block lg:h-screen lg:w-80 lg:overflow-y-auto lg:rounded-none lg:border-r lg:border-white/70 lg:bg-white/80 lg:p-6 lg:pb-10 lg:backdrop-blur-xl`}>
        <Link to="/" className="hidden items-center gap-3 lg:flex">
          <img src="/logo.png" alt="Logo AAC" className="h-14 w-14 rounded-2xl object-contain" />
          <div>
            <p className="font-black text-floresta">Painel Interno AAC</p>
            <p className="text-xs font-semibold text-slate-500">Diretoria e Conselho Fiscal</p>
          </div>
        </Link>

        <div className="mt-6 rounded-3xl bg-creme p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-terra">Usuário conectado</p>
          <p className="mt-1 truncate font-black text-floresta">{profile?.nome || session?.user?.email}</p>
          <p className="text-sm text-slate-600">{PERFIS[profile?.perfil] || 'Perfil pendente'}</p>
        </div>

        <nav className="mt-5 space-y-2">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 font-bold transition ${isActive ? 'bg-floresta text-white shadow-lg shadow-floresta/20' : 'text-slate-700 hover:bg-creme hover:text-floresta'}`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        <button onClick={logout} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 font-bold text-red-700 hover:bg-red-100">
          <LogOut size={18} />
          Sair
        </button>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
