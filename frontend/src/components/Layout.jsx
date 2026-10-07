import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Wrench, PlusCircle, ShoppingCart, Receipt, Users, LogOut, Menu, X, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/format';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/ordens', label: 'Ordens de Serviço', icon: Wrench, end: true },
    { to: '/ordens/nova', label: 'Nova OS', icon: PlusCircle },
    { to: '/vendas/nova', label: 'Nova Venda', icon: ShoppingCart },
    { to: '/vendas', label: 'Histórico de Vendas', icon: Receipt, end: true },
    ...(isAdmin ? [{ to: '/usuarios', label: 'Usuários', icon: Users }] : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-orange-500 text-white' : 'text-blue-100 hover:bg-blue-800'}`
          }
        >
          <Icon size={18} /> {label}
        </NavLink>
      ))}
      <a href="/consulta" target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-blue-100 hover:bg-blue-800">
        <Search size={18} /> Consulta pública
      </a>
    </nav>
  );

  const footer = (
    <div className="border-t border-blue-800 p-4">
      <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
      <p className="mb-3 text-xs text-blue-200">{ROLES[user?.role]}</p>
      <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-800 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
        <LogOut size={16} /> Sair
      </button>
    </div>
  );

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-blue-900 md:flex">
        <div className="flex items-center gap-2 p-5 text-xl font-extrabold text-white">
          <Wrench className="text-orange-400" /> Compu<span className="text-orange-400">Cell</span>
        </div>
        {nav}
        {footer}
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between bg-blue-900 px-4 py-3 md:hidden">
        <div className="flex items-center gap-2 text-lg font-extrabold text-white">
          <Wrench className="text-orange-400" size={20} /> Compu<span className="text-orange-400">Cell</span>
        </div>
        <button onClick={() => setOpen(true)} className="text-white"><Menu /></button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-blue-900">
            <button onClick={() => setOpen(false)} className="self-end p-4 text-white"><X /></button>
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