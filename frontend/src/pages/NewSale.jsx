import { useEffect, useRef, useState } from 'react';
import { Barcode, Search, Trash2, UserCheck } from 'lucide-react';
import api, { errMsg } from '../services/api';
import { useToast } from '../context/ToastContext';
import { brl, round2 } from '../utils/format';
import { btnGhost, btnPrimary, Card, EmptyState, inputCls, PageHeader } from '../components/ui';
import PaymentsEditor, { emptyPayment, paymentsPayload, sumPayments } from '../components/PaymentsEditor';

export default function NewSale() {
  const toast = useToast();
  const scanRef = useRef(null);
  const cartRef = useRef([]); // espelho síncrono: leituras rápidas seguidas não perdem itens

  const [cart, setCart] = useState([]);
  const [code, setCode] = useState('');
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [services, setServices] = useState([]);
  const [discount, setDiscount] = useState('');
  const [payments, setPayments] = useState([emptyPayment()]);
  const [allowPartial, setAllowPartial] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [customerQ, setCustomerQ] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [saving, setSaving] = useState(false);

  const commit = (next) => {
    cartRef.current = next;
    setCart(next);
  };
  const focusScan = () => scanRef.current?.focus();

  useEffect(() => {
    api.get('/services').then((r) => setServices(r.data)).catch(() => {});
    focusScan();
  }, []);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) {
      setResults([]);
      return undefined;
    }
    const id = setTimeout(() => api.get('/products', { params: { q: t, limit: 6 } }).then((r) => setResults(r.data)).catch(() => setResults([])), 250);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    const t = customerQ.trim();
    if (customer || t.length < 2) {
      setCustomerResults([]);
      return undefined;
    }
    const id = setTimeout(() => api.get('/customers', { params: { q: t, limit: 5 } }).then((r) => setCustomerResults(r.data)).catch(() => setCustomerResults([])), 250);
    return () => clearTimeout(id);
  }, [customerQ, customer]);

  const addProduct = (p) => {
    if (p.stock_quantity <= 0) return toast.error(`"${p.name}" está sem estoque`);
    const list = cartRef.current;
    const line = list.find((i) => i.key === `p:${p.id}`);
    if (line && line.quantity >= p.stock_quantity) return toast.error(`Estoque máximo de "${p.name}" atingido (${p.stock_quantity})`);
    commit(
      line
        ? list.map((i) => (i.key === line.key ? { ...i, quantity: i.quantity + 1 } : i))
        : [...list, { key: `p:${p.id}`, item_type: 'product', product_id: p.id, name: p.name, barcode: p.barcode, unit_price: p.sale_price, quantity: 1, max: p.stock_quantity }]
    );
  };

  const addService = (s) => {
    const list = cartRef.current;
    const line = list.find((i) => i.key === `s:${s.id}`);
    commit(
      line
        ? list.map((i) => (i.key === line.key ? { ...i, quantity: i.quantity + 1 } : i))
        : [...list, { key: `s:${s.id}`, item_type: 'service', service_id: s.id, name: s.name, unit_price: s.price, quantity: 1 }]
    );
    focusScan();
  };

  const scan = async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const value = code.trim();
    if (!value) return;
    setCode('');
    try {
      const { data } = await api.get(`/products/barcode/${encodeURIComponent(value)}`);
      addProduct(data);
    } catch (err) {
      toast.error(errMsg(err));
    }
    focusScan();
  };

  const setQty = (key, value) => {
    const item = cartRef.current.find((i) => i.key === key);
    let qty = Math.max(1, parseInt(value, 10) || 1);
    if (item.max && qty > item.max) {
      toast.error(`Estoque disponível: ${item.max}`);
      qty = item.max;
    }
    commit(cartRef.current.map((i) => (i.key === key ? { ...i, quantity: qty } : i)));
  };
  const setPrice = (key, value) => commit(cartRef.current.map((i) => (i.key === key ? { ...i, unit_price: value } : i)));
  const removeItem = (key) => commit(cartRef.current.filter((i) => i.key !== key));

  const subtotal = round2(cart.reduce((s, i) => s + (Number(i.unit_price) || 0) * i.quantity, 0));
  const disc = Math.min(Number(discount) || 0, subtotal);
  const total = round2(subtotal - disc);
  const remaining = round2(total - sumPayments(payments));

  const finish = async () => {
    if (cart.length === 0) return toast.error('Adicione ao menos um item ao carrinho');
    if (remaining < 0) return toast.error('O pagamento informado excede o total da venda');
    if (remaining > 0 && !allowPartial) return toast.error(`Falta receber ${brl(remaining)}. Registre o pagamento ou marque a venda com saldo pendente.`);
    if (remaining > 0 && !customer) return toast.error('Vincule um cliente para registrar uma venda com saldo pendente');

    setSaving(true);
    try {
      const { data } = await api.post('/sales', {
        items: cart.map((i) =>
          i.item_type === 'product'
            ? { item_type: 'product', product_id: i.product_id, quantity: i.quantity }
            : { item_type: 'service', service_id: i.service_id, quantity: i.quantity, unit_price: Number(i.unit_price) }
        ),
        discount_amount: disc,
        payments: paymentsPayload(payments),
        allow_partial: allowPartial,
        customer_id: customer?.id,
      });
      toast.success(`Venda #${data.sale_number} registrada — ${brl(data.grand_total_amount)}`);
      commit([]);
      setDiscount('');
      setPayments([emptyPayment()]);
      setAllowPartial(false);
      setCustomer(null);
      setCustomerQ('');
      focusScan();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader title="Nova venda" subtitle="Bipe o código de barras ou busque pelo nome. Serviços avulsos ficam logo abaixo." />

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="relative">
                <Barcode size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" />
                <input
                  ref={scanRef}
                  className={`${inputCls} border-orange-300 pl-10 font-mono text-base focus:border-orange-500 focus:ring-orange-500/20`}
                  placeholder="Código de barras (Enter)"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={scan}
                  inputMode="numeric"
                  aria-label="Código de barras"
                />
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className={`${inputCls} pl-9`} placeholder="Buscar produto por nome" value={q} onChange={(e) => setQ(e.target.value)} />
                {results.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-pop">
                    {results.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => {
                            addProduct(p);
                            setQ('');
                            setResults([]);
                            focusScan();
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-blue-50"
                        >
                          <span className="font-medium">{p.name}</span>
                          <span className="text-slate-500">{brl(p.sale_price)} · est. {p.stock_quantity}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {services.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {services.map((s) => (
                  <button key={s.id} type="button" onClick={() => addService(s)} className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800 ring-1 ring-blue-200 hover:bg-blue-100">
                    + {s.name} · {brl(s.price)}
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card title={`Carrinho (${cart.length})`}>
            {cart.length === 0 ? (
              <EmptyState>Carrinho vazio. Bipe um produto ou escolha um serviço.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr><th className="py-1">Item</th><th>Qtd.</th><th>Preço un.</th><th className="text-right">Subtotal</th><th /></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((i) => (
                      <tr key={i.key}>
                        <td className="py-2">
                          <p className="font-semibold">{i.name}</p>
                          <p className="text-xs text-slate-400">{i.item_type === 'service' ? 'Serviço' : i.barcode}</p>
                        </td>
                        <td><input className={`${inputCls} w-20`} type="number" min="1" value={i.quantity} onChange={(e) => setQty(i.key, e.target.value)} /></td>
                        <td>
                          {i.item_type === 'service' ? (
                            <input className={`${inputCls} w-24`} type="number" min="0" step="0.01" value={i.unit_price} onChange={(e) => setPrice(i.key, e.target.value)} />
                          ) : (
                            brl(i.unit_price)
                          )}
                        </td>
                        <td className="text-right font-semibold">{brl((Number(i.unit_price) || 0) * i.quantity)}</td>
                        <td className="text-right">
                          <button className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remover item" onClick={() => removeItem(i.key)}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card title="Cliente (opcional)">
            {customer ? (
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3 text-sm ring-1 ring-emerald-200">
                <span className="flex items-center gap-2"><UserCheck size={18} className="text-emerald-600" /> <b>{customer.name}</b></span>
                <button className="text-xs font-semibold underline" onClick={() => { setCustomer(null); setCustomerQ(''); }}>Trocar</button>
              </div>
            ) : (
              <div className="relative">
                <input className={inputCls} placeholder="Buscar cliente por nome ou telefone" value={customerQ} onChange={(e) => setCustomerQ(e.target.value)} />
                {customerResults.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-pop">
                    {customerResults.map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => { setCustomer(c); setCustomerResults([]); }} className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-blue-50">
                          <span className="font-medium">{c.name}</span><span className="text-slate-500">{c.phone}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <p className="mt-2 text-xs text-slate-500">Obrigatório apenas para venda com saldo pendente.</p>
          </Card>

          <Card title="Pagamento">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{brl(subtotal)}</span></div>
              <div className="flex items-center justify-between gap-3">
                <span>Desconto (R$)</span>
                <input className={`${inputCls} w-28 text-right`} type="number" min="0" step="0.01" max={subtotal} value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-xl font-extrabold text-ink-900"><span>Total</span><span>{brl(total)}</span></div>
            </div>

            <div className="mt-4">
              <PaymentsEditor value={payments} onChange={setPayments} due={total} />
            </div>

            {remaining > 0 && (
              <label className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
                <input className="mt-0.5" type="checkbox" checked={allowPartial} onChange={(e) => setAllowPartial(e.target.checked)} />
                Registrar a venda com saldo pendente de <b>{brl(remaining)}</b>
              </label>
            )}

            <button className={`${btnPrimary} mt-4 w-full py-3 text-base`} onClick={finish} disabled={saving || cart.length === 0}>
              {saving ? 'Finalizando…' : 'Finalizar venda'}
            </button>
            {cart.length > 0 && <button className={`${btnGhost} mt-2 w-full`} onClick={() => { commit([]); focusScan(); }}>Limpar carrinho</button>}
          </Card>
        </div>
      </div>
    </div>
  );
}