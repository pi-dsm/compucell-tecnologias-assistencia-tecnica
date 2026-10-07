import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import api, { errMsg } from '../services/api';
import { useToast } from '../context/ToastContext';
import { brl, METHODS, round2 } from '../utils/format';
import { btnBlue, btnPrimary, Card, Field, inputCls } from '../components/ui';

const empty = { name: '', price: '', cost: '', qty: 1 };

export default function NewSale() {
  const toast = useToast();
  const navigate = useNavigate();
  const [item, setItem] = useState(empty);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState('');
  const [method, setMethod] = useState('pix');
  const [saving, setSaving] = useState(false);

  const subtotal = round2(cart.reduce((s, i) => s + i.price * i.qty, 0));
  const costTotal = cart.reduce((s, i) => s + i.cost * i.qty, 0);
  const disc = Math.min(Number(discount) || 0, subtotal);
  const total = round2(subtotal - disc);
  const profit = round2(total - costTotal);

  const add = (e) => {
    e.preventDefault();
    if (!item.name.trim() || !(Number(item.price) >= 0) || item.price === '') return toast.error('Informe nome e preço do item');
    setCart((c) => [...c, { key: Date.now() + Math.random(), name: item.name.trim(), price: Number(item.price), cost: Number(item.cost) || 0, qty: Math.max(1, Number(item.qty) || 1) }]);
    setItem(empty);
  };

  const changeQty = (key, d) => setCart((c) => c.map((i) => (i.key === key ? { ...i, qty: Math.max(1, i.qty + d) } : i)));

  const finish = async () => {
    if (!cart.length) return toast.error('Adicione ao menos um item ao carrinho');
    setSaving(true);
    try {
      await api.post('/sales', {
        products_sold: cart.map((i) => ({ comercial_name: i.name, category: 'Balcão', selling_price: i.price, cost_price: i.cost, quantity: i.qty })),
        discount_amount: disc,
        payment_method: method,
      });
      toast.success(`Venda de ${brl(total)} finalizada!`);
      setCart([]);
      setDiscount('');
      navigate('/vendas');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-5">
      <h1 className="text-2xl font-extrabold text-blue-900 lg:col-span-5">Nova Venda</h1>

      <div className="space-y-4 lg:col-span-3">
        <Card title="Adicionar item">
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-6">
            <Field label="Produto / serviço *" className="sm:col-span-6"><input className={inputCls} value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} placeholder='Ex.: "Película iPhone 13" ou "Xerox"' autoFocus /></Field>
            <Field label="Preço (R$) *" className="sm:col-span-2"><input type="number" step="0.01" min="0" className={inputCls} value={item.price} onChange={(e) => setItem({ ...item, price: e.target.value })} /></Field>
            <Field label="Custo (R$)" className="sm:col-span-2"><input type="number" step="0.01" min="0" className={inputCls} value={item.cost} onChange={(e) => setItem({ ...item, cost: e.target.value })} /></Field>
            <Field label="Qtd" className="sm:col-span-1"><input type="number" min="1" className={inputCls} value={item.qty} onChange={(e) => setItem({ ...item, qty: e.target.value })} /></Field>
            <div className="flex items-end sm:col-span-1"><button className={`${btnBlue} w-full`}><Plus size={18} /></button></div>
          </form>
        </Card>

        <Card title={`Carrinho (${cart.length})`}>
          {cart.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Nenhum item adicionado.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {cart.map((i) => (
                <li key={i.key} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{i.name}</p>
                    <p className="text-xs text-slate-500">{brl(i.price)} un.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => changeQty(i.key, -1)} className="rounded border border-slate-300 p-1"><Minus size={14} /></button>
                    <span className="w-8 text-center text-sm font-bold">{i.qty}</span>
                    <button onClick={() => changeQty(i.key, 1)} className="rounded border border-slate-300 p-1"><Plus size={14} /></button>
                    <span className="w-24 text-right text-sm font-bold text-blue-900">{brl(i.price * i.qty)}</span>
                    <button onClick={() => setCart((c) => c.filter((x) => x.key !== i.key))} className="p-1 text-red-500"><Trash2 size={16} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card title="Fechamento" className="lg:sticky lg:top-6">
          <div className="space-y-3">
            <Field label="Desconto (R$)"><input type="number" step="0.01" min="0" className={inputCls} value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0,00" /></Field>
            <Field label="Forma de pagamento">
              <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}>
                {Object.entries(METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <dl className="space-y-1 rounded-lg bg-blue-50 p-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{brl(subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Desconto</dt><dd>- {brl(disc)}</dd></div>
              <div className="flex justify-between text-lg font-extrabold text-orange-600"><dt>Total</dt><dd>{brl(total)}</dd></div>
              <div className="flex justify-between text-xs text-slate-500"><dt>Lucro estimado</dt><dd>{brl(profit)}</dd></div>
            </dl>
            <button disabled={saving || !cart.length} onClick={finish} className={`${btnPrimary} w-full py-3 text-base`}>
              <ShoppingCart size={18} /> {saving ? 'Finalizando...' : 'Finalizar Venda'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}