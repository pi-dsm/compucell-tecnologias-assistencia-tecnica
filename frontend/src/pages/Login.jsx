import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../services/api';
import { btnPrimary, Field, inputCls } from '../components/ui';

export default function Login() {
  const { login, token } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-white"><Wrench size={28} /></div>
          <h1 className="text-2xl font-extrabold text-blue-900">Compu<span className="text-orange-500">Cell</span></h1>
          <p className="text-sm text-slate-500">Gestão de Assistência Técnica</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="E-mail">
            <input type="email" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" autoFocus />
          </Field>
          <Field label="Senha">
            <input type="password" required className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button className={`${btnPrimary} w-full`} disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
        </form>
        <Link to="/consulta" className="mt-5 block text-center text-sm font-medium text-blue-700 hover:underline">
          Sou cliente: consultar minha ordem de serviço
        </Link>
      </div>
    </div>
  );
}