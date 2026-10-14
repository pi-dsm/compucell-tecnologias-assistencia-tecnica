import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck } from 'lucide-react';
import api, { errMsg } from '../services/api';
import { useToast } from '../context/ToastContext';
import { DEVICE_TYPES, PASSCODE_KINDS, dateInputToISO, todayPlus } from '../utils/format';
import { btnGhost, btnPrimary, Card, Field, inputCls, PageHeader } from '../components/ui';
import PatternPad from '../components/os/PatternPad';
import ReceiptModal from '../components/os/ReceiptModal';

const blankCustomer = { name: '', phone: '', alternative_phone: '' };
const blankDevice = { device_type: 'phone', brand: '', model: '' };
const blankPasscode = { kind: 'none', pin: '', written: '', pattern: [] };


const passcodePayload = ({ kind, pin, written, pattern }) => {
  if (kind === 'pin') return { kind, pin };
  if (kind === 'written') return { kind, written };
  if (kind === 'pattern') return { kind, pattern };
  return { kind: 'none' };
};
const passcodeFromDevice = (d) => ({
  kind: d?.passcode?.kind || 'none',
  pin: d?.passcode?.pin || '',
  written: d?.passcode?.written || '',
  pattern: d?.passcode?.pattern || [],
});

function PasscodeFields({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-3">
      <Field label="Tipo de senha">
        <select className={inputCls} value={value.kind} onChange={(e) => set({ kind: e.target.value })}>
          {Object.entries(PASSCODE_KINDS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </Field>
      {value.kind === 'pin' && (
        <Field label="PIN (4 a 8 dígitos)">
          <input className={inputCls} inputMode="numeric" maxLength={8} value={value.pin} onChange={(e) => set({ pin: e.target.value.replace(/\D/g, '') })} />
        </Field>
      )}
      {value.kind === 'written' && (
        <Field label="Senha escrita">
          <input className={inputCls} value={value.written} onChange={(e) => set({ written: e.target.value })} />
        </Field>
      )}
      {value.kind === 'pattern' && <PatternPad value={value.pattern} onChange={(pattern) => set({ pattern })} />}
    </div>
  );
}

export default function NewServiceOrder() {
  const navigate = useNavigate();
  const toast = useToast();

  const [customer, setCustomer] = useState(null); // cliente já cadastrado
  const [newCustomer, setNewCustomer] = useState(blankCustomer);
  const [suggestions, setSuggestions] = useState([]);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(''); 
  const [device, setDevice] = useState(blankDevice);
  const [passcode, setPasscode] = useState(blankPasscode);
  const [form, setForm] = useState({
    reported_issue: '',
    estimated_budget_at: todayPlus(1),
    estimated_delivery_at: todayPlus(3),
    internal_notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);

  // Autocomplete: busca clientes enquanto digita o nome
  useEffect(() => {
    const q = newCustomer.name.trim();
    if (customer || q.length < 2) {
      setSuggestions([]);
      return undefined;
    }
    const t = setTimeout(() => {
      api.get('/customers', { params: { q, limit: 6 } }).then((r) => setSuggestions(r.data)).catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(t);
  }, [newCustomer.name, customer]);

  const selectDevice = (d) => {
    setDeviceId(d ? d.id : '');
    setPasscode(d ? passcodeFromDevice(d) : blankPasscode);
  };

  const pickCustomer = async (c) => {
    setCustomer(c);
    setSuggestions([]);
    try {
      const { data } = await api.get(`/customers/${c.id}/devices`);
      setDevices(data);
      selectDevice(data[0] || null);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const clearCustomer = () => {
    setCustomer(null);
    setNewCustomer(blankCustomer);
    setDevices([]);
    selectDevice(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!customer && (!newCustomer.name.trim() || !newCustomer.phone.trim())) return toast.error('Informe o nome e o telefone do cliente');
    if (!deviceId && (!device.brand.trim() || !device.model.trim())) return toast.error('Informe a marca e o modelo do aparelho');
    if (passcode.kind === 'pin' && !/^\d{4,8}$/.test(passcode.pin)) return toast.error('O PIN deve ter de 4 a 8 dígitos');
    if (passcode.kind === 'written' && !passcode.written.trim()) return toast.error('Informe a senha escrita');
    if (passcode.kind === 'pattern' && passcode.pattern.length < 4) return toast.error('Desenhe o padrão com ao menos 4 pontos');
    if (!form.reported_issue.trim()) return toast.error('Informe o problema detectado');
    if (!form.estimated_budget_at || !form.estimated_delivery_at) return toast.error('Informe as previsões de orçamento e de entrega');

    const body = {
      ...(customer ? { customer_id: customer.id } : { customer: newCustomer }),
      ...(deviceId
        ? { device_id: deviceId, device: { passcode: passcodePayload(passcode) } }
        : { device: { ...device, passcode: passcodePayload(passcode) } }),
      reported_issue: form.reported_issue,
      estimated_budget_at: dateInputToISO(form.estimated_budget_at),
      estimated_delivery_at: dateInputToISO(form.estimated_delivery_at),
      internal_notes: form.internal_notes,
    };

    setSaving(true);
    try {
      const { data } = await api.post('/service-orders', body);
      toast.success(`OS #${data.service_order_number} aberta com sucesso!`);
      setCreated(data); // abre o modal do comprovante automaticamente
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

return (
    <form onSubmit={submit} className="mx-auto max-w-5xl space-y-5">
      <PageHeader title="Nova ordem de serviço" subtitle="Campos marcados com * são obrigatórios." />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Card title="Cliente">
            {customer ? (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-200">
                <div className="flex items-center gap-2 text-sm">
                  <UserCheck className="text-emerald-600" size={20} />
                  <div>
                    <p className="font-semibold text-emerald-900">{customer.name}</p>
                    <p className="text-emerald-800">{customer.phone}</p>
                  </div>
                </div>
                <button type="button" onClick={clearCustomer} className="text-xs font-semibold text-slate-600 underline">Trocar</button>
              </div>
            ) : (
              <div className="space-y-3">
                <Field label="Nome do cliente *" hint="Comece a digitar para buscar um cliente já cadastrado.">
                  <div className="relative">
                    <input className={inputCls} autoFocus value={newCustomer.name} onChange={(e) => setNewCustomer((s) => ({ ...s, name: e.target.value }))} />
                    {suggestions.length > 0 && (
                      <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-pop">
                        {suggestions.map((c) => (
                          <li key={c.id}>
                            <button type="button" onClick={() => pickCustomer(c)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-blue-50">
                              <span className="font-medium">{c.name}</span>
                              <span className="text-slate-500">{c.phone}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Telefone *">
                    <input className={inputCls} inputMode="tel" value={newCustomer.phone} onChange={(e) => setNewCustomer((s) => ({ ...s, phone: e.target.value }))} />
                  </Field>
                  <Field label="Telefone alternativo">
                    <input className={inputCls} inputMode="tel" value={newCustomer.alternative_phone} onChange={(e) => setNewCustomer((s) => ({ ...s, alternative_phone: e.target.value }))} />
                  </Field>
                </div>
              </div>
            )}
          </Card>

          <Card title="Dispositivo">
            {devices.length > 0 && (
              <div className="mb-4 space-y-2">
                {devices.map((d) => (
                  <label key={d.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${deviceId === d.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                    <input type="radio" name="device" checked={deviceId === d.id} onChange={() => selectDevice(d)} />
                    <span><b>{d.brand} {d.model}</b> <span className="text-slate-500">· {DEVICE_TYPES[d.device_type]}{d.serial_number ? ` · ${d.serial_number}` : ''}</span></span>
                  </label>
                ))}
                <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${deviceId === '' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                  <input type="radio" name="device" checked={deviceId === ''} onChange={() => selectDevice(null)} />
                  <b>Cadastrar outro aparelho</b>
                </label>
              </div>
            )}

            {deviceId === '' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tipo *">
                  <select className={inputCls} value={device.device_type} onChange={(e) => setDevice((s) => ({ ...s, device_type: e.target.value }))}>
                    {Object.entries(DEVICE_TYPES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                </Field>
                <Field label="Marca *">
                  <input className={inputCls} value={device.brand} onChange={(e) => setDevice((s) => ({ ...s, brand: e.target.value }))} />
                </Field>
                <Field label="Modelo *">
                  <input className={inputCls} value={device.model} onChange={(e) => setDevice((s) => ({ ...s, model: e.target.value }))} />
                </Field>
              </div>
            )}

            <div className="mt-4 border-t border-slate-100 pt-4">
              <PasscodeFields value={passcode} onChange={setPasscode} />
            </div>
          </Card>
        </div>

        <Card title="Atendimento" className="self-start">
          <div className="space-y-3">
            <Field label="Problema detectado *">
              <textarea className={inputCls} rows={4} value={form.reported_issue} onChange={(e) => setForm((s) => ({ ...s, reported_issue: e.target.value }))} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Previsão de orçamento *">
                <input type="date" className={inputCls} value={form.estimated_budget_at} onChange={(e) => setForm((s) => ({ ...s, estimated_budget_at: e.target.value }))} />
              </Field>
              <Field label="Previsão de entrega *">
                <input type="date" className={inputCls} value={form.estimated_delivery_at} onChange={(e) => setForm((s) => ({ ...s, estimated_delivery_at: e.target.value }))} />
              </Field>
            </div>
            <Field label="Observações internas" hint="Não aparecem no comprovante do cliente.">
              <textarea className={inputCls} rows={3} value={form.internal_notes} onChange={(e) => setForm((s) => ({ ...s, internal_notes: e.target.value }))} />
            </Field>
          </div>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className={btnGhost} onClick={() => navigate('/ordens')}>Cancelar</button>
        <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Salvando…' : 'Abrir ordem de serviço'}</button>
      </div>

      {created && <ReceiptModal orderId={created.id} number={created.service_order_number} onClose={() => navigate('/ordens')} />}
    </form>
  );
}