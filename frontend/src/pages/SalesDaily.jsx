import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Info as InfoIcon } from 'lucide-react';
import api, { errMsg } from '../services/api';
import { useToast } from '../context/ToastContext';
import { brl, dt, isoToDateInput, PRODUCT_CATEGORIES } from '../utils/format';
import { btnGhost, btnSm, EmptyState, Info, inputCls, Modal, PageHeader, Spinner } from '../components/ui';

const today = () => isoToDateInput(new Date().toISOString());
const shift = (key, days) => isoToDateInput(new Date(new Date(`${key}T12:00:00`).getTime() + days * 86400000).toISOString());
const pct = (v) => `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

// Modal rápido com os dados estendidos do produto vendido
function ItemInfoModal({ row, onClose }) {
  const [product, setProduct] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (row.item_type !== 'product' || !row.product_id) return;
    api.get(`/products/${row.product_id}`).then((r) => setProduct(r.data)).catch(() => setMissing(true));
  }, [row]);

  return (
    <Modal title={row.name} onClose={onClose} size="sm">
      {row.item_type === 'service' ? (
        <p className="text-sm text-slate-600">Serviço avulso. Não possui código de barras nem controle de estoque.</p>
      ) : missing ? (
        <p className="text-sm text-slate-600">Produto não encontrado no cadastro (pode ter sido removido).</p>
      ) : !product ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Info label="Código de barras" value={product.barcode} />
          <Info label="Categoria" value={PRODUCT_CATEGORIES[product.category]} />
          <Info label="Fornecedor" value={product.supplier?.name} />
          <Info label="Situação" value={product.is_active ? 'Ativo' : 'Inativo'} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Estoque atual</p>
            <p className={`text-lg font-extrabold ${product.is_low_stock ? 'text-red-600' : 'text-emerald-700'}`}>
              {product.stock_quantity} <span className="text-xs font-medium text-slate-500">(mín. {product.min_stock})</span>
            </p>
          </div>
          <Info label="Preço atual" value={brl(product.sale_price)} />
          <div className="col-span-2 text-right">
            <Link to="/produtos" className="text-sm font-semibold text-blue-700 underline">Abrir em Produtos</Link>
          </div>
        </div>
      )}
      <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
        Nesta venda: {row.quantity}× a {brl(row.unit_price)} (custo {brl(row.unit_cost)}).
      </p>
    </Modal>
  );
}

export default function SalesDaily() {
  const toast = useToast();
  const [day, setDay] = useState(today());
  const [data, setData] = useState(null);
  const [info, setInfo] = useState(null);

  const load = useCallback(async () => {
    setData(null);
    try {
      setData((await api.get('/sales/items', { params: { from: day, to: day } })).data);
    } catch (e) {
      toast.error(errMsg(e));
      setData({ rows: [], totals: null });
    }
  }, [day]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeader title="Vendas por item" subtitle="Cada item vendido em uma linha, com custo, valor de venda e lucro.">
        <button className={`${btnGhost} ${btnSm}`} onClick={() => setDay(shift(day, -1))} aria-label="Dia anterior"><ChevronLeft size={16} /></button>
        <input type="date" className={`${inputCls} w-auto`} value={day} max={today()} onChange={(e) => e.target.value && setDay(e.target.value)} />
        <button className={`${btnGhost} ${btnSm}`} onClick={() => setDay(shift(day, 1))} disabled={day >= today()} aria-label="Próximo dia"><ChevronRight size={16} /></button>
        <button className={`${btnGhost} ${btnSm}`} onClick={() => setDay(today())}>Hoje</button>
      </PageHeader>

      {!data ? (
        <Spinner />
      ) : data.rows.length === 0 ? (
        <EmptyState>Nenhuma venda neste dia.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {['Data e hora', 'Produto / serviço', 'Qtd.', 'Custo un.', 'Custo total', 'Venda un.', 'Venda total', 'Lucro (R$)', 'Lucro (%)'].map((h, i) => (
                  <th key={h} className={`px-3 py-2.5 font-semibold ${i >= 2 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map((r, idx) => (
                <tr key={`${r.sale_id}-${idx}`} className="hover:bg-blue-50/30">
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{dt(r.created_at)} <span className="text-xs text-slate-400">· #{r.sale_number}</span></td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-semibold">{r.name}</span>
                      {r.item_type === 'service' && <span className="rounded bg-blue-50 px-1.5 text-[11px] font-bold text-blue-700">SERVIÇO</span>}
                      <button className="rounded-full p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-700" onClick={() => setInfo(r)} aria-label={`Detalhes de ${r.name}`}><InfoIcon size={15} /></button>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">{r.quantity}</td>
                  <td className="px-3 py-2.5 text-right text-slate-500">{brl(r.unit_cost)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-500">{brl(r.total_cost)}</td>
                  <td className="px-3 py-2.5 text-right">{brl(r.unit_price)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold">
                    {brl(r.total_price)}
                    {r.discount_share > 0 && <span className="block text-[11px] font-normal text-emerald-700">desc. − {brl(r.discount_share)}</span>}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-bold ${r.profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{brl(r.profit)}</td>
                  <td className={`px-3 py-2.5 text-right ${r.profit < 0 ? 'text-red-600' : 'text-slate-600'}`}>{pct(r.profit_pct)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold text-ink-900">
              <tr>
                <td className="px-3 py-2.5" colSpan={4}>Total do dia · {data.totals.items} item(ns)</td>
                <td className="px-3 py-2.5 text-right">{brl(data.totals.total_cost)}</td>
                <td />
                <td className="px-3 py-2.5 text-right">{brl(data.totals.total_price)}</td>
                <td className="px-3 py-2.5 text-right text-emerald-700">{brl(data.totals.profit)}</td>
                <td className="px-3 py-2.5 text-right">{pct(data.totals.profit_pct)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-400">O valor total de venda já considera o desconto da venda, rateado proporcionalmente entre os itens.</p>

      {info && <ItemInfoModal row={info} onClose={() => setInfo(null)} />}
    </div>
  );
}