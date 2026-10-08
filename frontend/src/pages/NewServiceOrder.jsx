import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Download, FileText, Printer, X } from 'lucide-react';
import api, { errMsg } from '../services/api';
import { useToast } from '../context/ToastContext';
import { btnGhost, btnPrimary, Card, Field, inputCls, Modal } from '../components/ui';

const DEVICE_TYPES = ['Celular', 'Tablet', 'Notebook', 'Computador', 'Console', 'Smartwatch', 'TV', 'Outro'];

const initial = {
  customer_id: '', customer_name: '', customer_phone: '', customer_alt: '',
  device_type: 'Celular', device_brand: '', device_model: '',
  reported_issue: '', passcode_pin: '', passcode_written: '', estimated_budget_days: 1,
};

function PatternPad({ value, onChange }) {
  const points = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const toggle = (p) => {
    const arr = value.includes(p) ? value.filter((v) => v !== p) : [...value, p];
    onChange(arr);
  };
  return (
    <div className="inline-grid grid-cols-3 gap-3 rounded-lg border border-slate-300 bg-white p-4">
      {points.map((p) => (
        <button
          type="button"
          key={p}
          onClick={() => toggle(p)}
          className={`h-8 w-8 rounded-full border-2 transition ${value.includes(p) ? 'border-orange-500 bg-orange-500' : 'border-slate-300 bg-slate-100'}`}
        />
      ))}
    </div>
  );
}

function base64ToBlob(base64, type = 'application/pdf') {
  const byteChars = atob(base64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  return new Blob([bytes], { type });
}

export default function NewServiceOrder() {
  const navigate = useNavigate();
  const toast = useToast();
  const [f, setF] = useState(initial);
  const [pattern, setPattern] = useState([]);
  const [sugs, setSugs] = useState([]);
  const [picked, setPicked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successModal, setSuccessModal] = useState(null);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    if (picked || f.customer_name.trim().length < 2) {
      setSugs([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/service-orders/customers/search', { params: { q: f.customer_name } });
        setSugs(data);
      } catch {
        setSugs([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [f.customer_name, picked]);

  const pick = (c) => {
    setPicked(true);
    setSugs([]);
    setF((s) => ({
      ...s,
      customer_id: c.customer_id,
      customer_name: c.customer_name,
      customer_phone: c.customer_phone || '',
      customer_alt: c.customer_alternative_phone || '',
    }));
  };

  const validate = () => {
    if (step === 0 && (!f.customer_name.trim() || !f.customer_phone.trim())) return 'Informe o nome e o telefone do cliente';
    if (step === 1 && (!f.device_brand.trim() || !f.device_model.trim())) return 'Informe a marca e o modelo do aparelho';
    if (step === 2 && (!f.reported_issue.trim() || !f.physical_condition.trim())) return 'Informe o problema relatado e o estado físico';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!f.customer_name.trim() || !f.customer_phone.trim()) return toast.error('Informe o nome e o telefone do cliente');
    if (!f.device_brand.trim() && !f.device_model.trim()) return toast.error('Informe o modelo do aparelho');
    if (!f.reported_issue.trim()) return toast.error('Informe o problema detectado');

    setSaving(true);
    try {
      const payload = {
        customer: { customer_id: f.customer_id || undefined, customer_name: f.customer_name, customer_phone: f.customer_phone, customer_alternative_phone: f.customer_alt },
        device: {
          device_type: f.device_type,
          device_brand: f.device_brand || f.device_type,
          device_model: f.device_model,
          passcode_pin: f.passcode_pin,
          passcode_written: f.passcode_written,
          passcode_pattern: pattern,
        },
        reported_issue: f.reported_issue,
        estimated_budget_days: Number(f.estimated_budget_days) || 1,
      };
      const { data } = await api.post('/service-orders', payload);
      toast.success(`OS #${data.service_order_number} aberta com sucesso!`);
      setSuccessModal({ id: data.id, soNumber: data.service_order_number, pdfBase64: data.pdfBase64 });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (!successModal?.pdfBase64) return toast.error('PDF indisponível para impressão');
    try {
      const blob = base64ToBlob(successModal.pdfBase64, 'application/pdf');
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch {
          toast.error('Não foi possível acionar a impressão automática. Use o download.');
        }
      };
    } catch {
      toast.error('Falha ao preparar o PDF para impressão');
    }
  };

  const handleDownload = async () => {
    if (!successModal) return;
    try {
      let blob;
      if (successModal.pdfBase64) {
        blob = base64ToBlob(successModal.pdfBase64, 'application/pdf');
      } else {
        const { data } = await api.get(`/service-orders/${successModal.id}/pdf`, { responseType: 'blob' });
        blob = data;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OS-${successModal.soNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const closeSuccess = () => {
    const id = successModal?.id;
    setSuccessModal(null);
    navigate(id ? `/ordens/${id}` : '/ordens');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-extrabold text-blue-900">Nova Ordem de Serviço</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card title="Cliente">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative sm:col-span-2">
              <Field label="Nome completo * (digite para buscar clientes anteriores)">
                <input className={inputCls} value={f.customer_name} autoFocus autoComplete="off"
                  onChange={(e) => { setPicked(false); setF((s) => ({ ...s, customer_name: e.target.value, customer_id: '' })); }} />
              </Field>
              {sugs.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  {sugs.map((c) => (
                    <li key={c.customer_id}>
                      <button type="button" onClick={() => pick(c)} className="flex w-full flex-col px-3 py-2 text-left hover:bg-orange-50">
                        <span className="text-sm font-semibold text-slate-800">{c.customer_name}</span>
                        <span className="text-xs text-slate-500">{c.customer_phone}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Field label="Telefone próprio *"><input className={inputCls} value={f.customer_phone} onChange={set('customer_phone')} placeholder="(00) 00000-0000" /></Field>
            <Field label="Telefone para contato"><input className={inputCls} value={f.customer_alt} onChange={set('customer_alt')} /></Field>
          </div>
        </Card>

        <Card title="Dispositivo">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo de dispositivo">
              <select className={inputCls} value={f.device_type} onChange={set('device_type')}>
                {DEVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Modelo *"><input className={inputCls} value={f.device_model} onChange={set('device_model')} placeholder="Ex.: Galaxy A54" /></Field>
            <Field label="Problema detectado *" className="sm:col-span-2"><textarea rows={3} className={inputCls} value={f.reported_issue} onChange={set('reported_issue')} /></Field>
            <Field label="Previsão de orçamento (dias)"><input type="number" min="0" className={inputCls} value={f.estimated_budget_days} onChange={set('estimated_budget_days')} /></Field>
          </div>
        </Card>

        <Card title="Senhas de acesso">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="PIN"><input className={inputCls} value={f.passcode_pin} onChange={set('passcode_pin')} /></Field>
            <Field label="Senha escrita"><input className={inputCls} value={f.passcode_written} onChange={set('passcode_written')} /></Field>
            <div className="sm:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">Padrão de desenho</span>
              <PatternPad value={pattern} onChange={setPattern} />
            </div>
          </div>
        </Card>

        <div className="flex justify-between gap-3">
          <button type="button" className={btnGhost} onClick={() => navigate('/ordens')}>Cancelar</button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Salvando...' : (<><Check size={16} /> Abrir Ordem de Serviço</>)}
          </button>
        </div>
      </form>

      {successModal && (
        <Modal title={`OS #${successModal.soNumber} aberta!`} onClose={closeSuccess}>
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><FileText size={32} /></div>
            <p className="text-sm text-slate-600">Ordem de serviço registrada com sucesso. Escolha uma das opções abaixo para a 2ª via:</p>
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <button onClick={handleDownload} className={`${btnGhost} w-full`}><Download size={16} /> Fazer download</button>
              <button onClick={handlePrint} className={`${btnPrimary} w-full`}><Printer size={16} /> Imprimir via cliente</button>
            </div>
            <button onClick={closeSuccess} className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700">
              <X size={16} /> Concluir
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}