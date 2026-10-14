import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Wrench, ShoppingCart, Receipt, Package, Tags, Users, LogOut, Menu, X, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/format';

const GROUPS = [
  {
    title: 'Atendimento',
    links: [
      { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
      { to: '/ordens', label: 'Ordens de serviço', icon: Wrench },
      // { to: '/vendas/nova', label: 'Nova venda', icon: ShoppingCart },
      { to: '/vendas', label: 'Histórico de vendas', icon: Receipt, end: true },
    ],
  },
  {
    title: 'Cadastros',
    links: [
      { to: '/produtos', label: 'Produtos e estoque', icon: Package },
      { to: '/servicos', label: 'Serviços', icon: Tags },
    ],
  },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const groups = isAdmin
    ? [...GROUPS, { title: 'Administração', links: [{ to: '/usuarios', label: 'Usuários', icon: Users }] }]
    : GROUPS;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkCls = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
      isActive ? 'bg-orange-500 text-white shadow-card' : 'text-blue-100/80 hover:bg-ink-800 hover:text-white'
    }`;

  const nav = (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto p-3">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-blue-200/50">{g.title}</p>
          <div className="flex flex-col gap-1">
            {g.links.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={linkCls}>
                <Icon size={18} /> {label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
      <a href="/consulta" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-blue-100/80 hover:bg-ink-800 hover:text-white">
        <Search size={18} /> Consulta pública
      </a>
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 p-4">
      <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
      <p className="mb-3 text-xs text-blue-200/60">{ROLES[user?.role]}</p>
      <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink-800 px-3 py-2 text-sm font-medium text-white hover:bg-ink-700">
        <LogOut size={16} /> Sair
      </button>
    </div>
  );

  const logo = (
    <div className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-white">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500"><Wrench size={18} /></span>
      Compu<span className="text-orange-400">Cell</span>
    </div>
  );

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-ink-900 md:flex">
        <div className="p-5">{logo}</div>
        {nav}
        {footer}
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between bg-ink-900 px-4 py-3 md:hidden">
        {logo}
        <button onClick={() => setOpen(true)} className="text-white" aria-label="Abrir menu"><Menu /></button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-ink-900">
            <button onClick={() => setOpen(false)} className="self-end p-4 text-white" aria-label="Fechar menu"><X /></button>
            {nav}
            {footer}
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}