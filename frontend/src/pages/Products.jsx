import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Barcode, Boxes, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import api, { errMsg } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { brl, PRODUCT_CATEGORIES } from '../utils/format';
import { btnGhost, btnPrimary, btnSm, ConfirmModal, EmptyState, Field, inputCls, Modal, PageHeader, Spinner } from '../components/ui';

const blank = { name: '', barcode: '', category: 'accessory', cost_price: '', sale_price: '', stock_quantity: '', min_stock: '' };

export default function Products() {
  const toast = useToast();
  const { user, isAdmin } = useAuth();
  const canEdit = user?.role !== 'technician';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [form, setForm] = useState(null); // produto em edição/criação
  const [stockFor, setStockFor] = useState(null);
  const [stock, setStock] = useState({ delta: '', reason: '' });
  const [removing, setRemoving] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/products', {
        params: { q: q || undefined, category: category || undefined, low_stock: lowOnly || undefined, limit: 500 },
      });
      setItems(data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [q, category, lowOnly]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const save = async (e) => {
    e.preventDefault();
    if (!form.barcode.trim()) return toast.error('Informe o código de barras (ou gere um código interno)');
    const body = {
      name: form.name,
      barcode: form.barcode.trim(),
      category: form.category,
      cost_price: Number(form.cost_price) || 0,
      sale_price: Number(form.sale_price),
      min_stock: Number(form.min_stock) || 0,
      ...(form.id ? {} : { stock_quantity: Number(form.stock_quantity) || 0 }),
    };
    setSaving(true);
    try {
      if (form.id) await api.put(`/products/${form.id}`, body);
      else await api.post('/products', body);
      toast.success('Produto salvo');
      setForm(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const adjust = async () => {
    setSaving(true);
    try {
      await api.patch(`/products/${stockFor.id}/stock`, { delta: Number(stock.delta), reason: stock.reason });
      toast.success('Estoque ajustado');
      setStockFor(null);
      setStock({ delta: '', reason: '' });
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/products/${removing.id}`);
      toast.success('Produto desativado');
      setRemoving(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader title="Produtos e estoque" subtitle="Cada produto tem código de barras único, usado no PDV.">
        {canEdit && <button className={btnPrimary} onClick={() => setForm({ ...blank })}><Plus size={18} /> Novo produto</button>}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputCls} pl-9`} placeholder="Buscar por nome ou código de barras…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={`${inputCls} w-auto`} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Todas as categorias</option>
          {Object.entries(PRODUCT_CATEGORIES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Só estoque baixo
        </label>
      </div>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState>Nenhum produto encontrado.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>{['Produto', 'Código de barras', 'Categoria', 'Custo', 'Venda', 'Estoque', ''].map((h) => <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2.5 font-semibold">{p.name}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{p.barcode}</td>
                  <td className="px-3 py-2.5">{PRODUCT_CATEGORIES[p.category]}</td>
                  <td className="px-3 py-2.5 text-slate-500">{brl(p.cost_price)}</td>
                  <td className="px-3 py-2.5 font-semibold">{brl(p.sale_price)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${p.is_low_stock ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-emerald-50 text-emerald-800 ring-emerald-200'}`}>
                      {p.is_low_stock && <AlertTriangle size={12} />} {p.stock_quantity}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {canEdit && (
                      <div className="flex justify-end gap-1.5">
                        <button className={`${btnGhost} ${btnSm}`} onClick={() => setStockFor(p)}><Boxes size={14} /> Estoque</button>
                        <button className={`${btnGhost} ${btnSm}`} onClick={() => setForm({ ...p, cost_price: p.cost_price, sale_price: p.sale_price })} aria-label="Editar"><Pencil size={14} /></button>
                        {isAdmin && <button className={`${btnGhost} ${btnSm} text-red-600`} onClick={() => setRemoving(p)} aria-label="Desativar"><Trash2 size={14} /></button>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Modal title={form.id ? 'Editar produto' : 'Novo produto'} onClose={() => setForm(null)}>
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome *" className="sm:col-span-2">
              <input className={inputCls} required autoFocus value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            </Field>
            <Field label="Código de barras *" hint="Use o leitor aqui. Sem código? Gere um interno." className="sm:col-span-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className={`${inputCls} pl-9 font-mono`}
                    value={form.barcode}
                    onChange={(e) => setForm((s) => ({ ...s, barcode: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()} // o leitor envia Enter; não deve salvar o formulário
                  />
                </div>
                <button type="button" className={btnGhost} onClick={() => setForm((s) => ({ ...s, barcode: `INT-${Date.now().toString(36).toUpperCase()}` }))}>Gerar código</button>
              </div>
            </Field>
            <Field label="Categoria">
              <select className={inputCls} value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}>
                {Object.entries(PRODUCT_CATEGORIES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </Field>
            <Field label="Estoque mínimo (alerta)">
              <input className={inputCls} type="number" min="0" value={form.min_stock} onChange={(e) => setForm((s) => ({ ...s, min_stock: e.target.value }))} />
            </Field>
            <Field label="Custo (R$)">
              <input className={inputCls} type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => setForm((s) => ({ ...s, cost_price: e.target.value }))} />
            </Field>
            <Field label="Preço de venda (R$) *">
              <input className={inputCls} type="number" min="0" step="0.01" required value={form.sale_price} onChange={(e) => setForm((s) => ({ ...s, sale_price: e.target.value }))} />
            </Field>
            {!form.id && (
              <Field label="Estoque inicial">
                <input className={inputCls} type="number" min="0" value={form.stock_quantity} onChange={(e) => setForm((s) => ({ ...s, stock_quantity: e.target.value }))} />
              </Field>
            )}
            <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>Cancelar</button>
              <button className={btnPrimary} disabled={saving}>{saving ? 'Salvando…' : 'Salvar produto'}</button>
            </div>
          </form>
        </Modal>
      )}

      {stockFor && (
        <Modal title={`Ajustar estoque — ${stockFor.name}`} onClose={() => setStockFor(null)} size="sm">
          <p className="mb-3 text-sm text-slate-500">Estoque atual: <b>{stockFor.stock_quantity}</b>. Use valores negativos para baixas (perda, quebra, contagem).</p>
          <div className="space-y-3">
            <Field label="Quantidade (+ entrada / − saída)">
              <input className={inputCls} type="number" step="1" value={stock.delta} onChange={(e) => setStock((s) => ({ ...s, delta: e.target.value }))} />
            </Field>
            <Field label="Motivo *">
              <input className={inputCls} placeholder="Ex.: compra de reposição" value={stock.reason} onChange={(e) => setStock((s) => ({ ...s, reason: e.target.value }))} />
            </Field>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button className={btnGhost} onClick={() => setStockFor(null)}>Cancelar</button>
            <button className={btnPrimary} onClick={adjust} disabled={saving || !stock.delta || !stock.reason.trim()}>Confirmar ajuste</button>
          </div>
        </Modal>
      )}

      {removing && (
        <ConfirmModal
          title="Desativar produto"
          message={`Desativar "${removing.name}"? Ele deixa de aparecer no PDV, mas o histórico de vendas é preservado.`}
          confirmLabel="Desativar"
          danger
          onConfirm={remove}
          onClose={() => setRemoving(null)}
        />
      )}
    </div>
  );
}