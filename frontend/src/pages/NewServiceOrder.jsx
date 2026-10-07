import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Smartphone, User, Wrench } from 'lucide-react';
import api, { errMsg } from '../services/api';
import { useToast } from '../context/ToastContext';
import { btnGhost, btnPrimary, Card, Field, inputCls } from '../components/ui';

const STEPS = [
  { title: 'Cliente', icon: User },
  { title: 'Dispositivo', icon: Smartphone },
  { title: 'Problema', icon: Wrench },
];
const DEVICE_TYPES = ['Celular', 'Tablet', 'Notebook', 'Computador', 'Console', 'Smartwatch', 'TV', 'Outro'];

const initial = {
  customer_id: '', customer_name: '', customer_phone: '', customer_alt: '',
  device_type: 'Celular', device_brand: '', device_model: '', device_serial: '', device_color: '',
  reported_issue: '', physical_condition: '', passcode: '', accessories: '', estimated: '',
};

export default function NewServiceOrder() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [f, setF] = useState(initial);
  const [sugs, setSugs] = useState([]);
  const [picked, setPicked] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        customer: { customer_id: f.customer_id || undefined, customer_name: f.customer_name, customer_phone: f.customer_phone, customer_alternative_phone: f.customer_alt },
        device: { device_type: f.device_type, device_brand: f.device_brand, device_model: f.device_model, device_serial_number: f.device_serial, device_extra_info: f.device_color },
        reported_issue: f.reported_issue,
        physical_condition: f.physical_condition,
        passcode: f.passcode,
        acessories_left_behind: f.accessories,
        estimated_delivery_at: f.estimated || undefined,
      };
      const { data } = await api.post('/service-orders', payload);
      toast.success(`OS #${data.service_order_number} aberta com sucesso!`);
      navigate(`/ordens/${data.id}`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return toast.error(err);
    if (step < 2) setStep(step + 1);
    else submit();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-extrabold text-blue-900">Nova Ordem de Serviço</h1>

      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <li key={s.title} className="flex flex-1 items-center gap-2">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${done ? 'bg-emerald-500 text-white' : active ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {done ? <Check size={18} /> : <Icon size={18} />}
              </div>
              <span className={`hidden text-sm font-semibold sm:block ${active ? 'text-blue-900' : 'text-slate-500'}`}>{s.title}</span>
              {i < STEPS.length - 1 && <div className="h-0.5 flex-1 bg-slate-200" />}
            </li>
          );
        })}
      </ol>

      <form onSubmit={onSubmit}>
        <Card title={`${step + 1}. ${STEPS[step].title}`}>
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="relative sm:col-span-2">
                <Field label="Nome do cliente * (digite para buscar clientes anteriores)">
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
                {f.customer_id && <p className="mt-1 text-xs font-medium text-emerald-600">✓ Cliente existente carregado</p>}
              </div>
              <Field label="Telefone / WhatsApp *"><input className={inputCls} value={f.customer_phone} onChange={set('customer_phone')} placeholder="(00) 00000-0000" /></Field>
              <Field label="Telefone alternativo"><input className={inputCls} value={f.customer_alt} onChange={set('customer_alt')} /></Field>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipo">
                <select className={inputCls} value={f.device_type} onChange={set('device_type')}>
                  {DEVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Marca *"><input className={inputCls} value={f.device_brand} onChange={set('device_brand')} placeholder="Ex.: Samsung" autoFocus /></Field>
              <Field label="Modelo *"><input className={inputCls} value={f.device_model} onChange={set('device_model')} placeholder="Ex.: Galaxy A54" /></Field>
              <Field label="Nº de série / IMEI"><input className={inputCls} value={f.device_serial} onChange={set('device_serial')} /></Field>
              <Field label="Cor / informações extras" className="sm:col-span-2"><input className={inputCls} value={f.device_color} onChange={set('device_color')} placeholder="Ex.: Preto, com riscos na lateral" /></Field>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Problema relatado *" className="sm:col-span-2"><textarea rows={3} className={inputCls} value={f.reported_issue} onChange={set('reported_issue')} autoFocus /></Field>
              <Field label="Estado físico do aparelho *" className="sm:col-span-2"><textarea rows={2} className={inputCls} value={f.physical_condition} onChange={set('physical_condition')} placeholder="Riscos, trincos, sinais de queda ou umidade..." /></Field>
              <Field label="Senha / padrão (opcional)"><input className={inputCls} value={f.passcode} onChange={set('passcode')} /></Field>
              <Field label="Acessórios deixados (opcional)"><input className={inputCls} value={f.accessories} onChange={set('accessories')} placeholder="Carregador, capinha, chip..." /></Field>
              <Field label="Previsão de entrega (opcional)"><input type="date" className={inputCls} value={f.estimated} onChange={set('estimated')} /></Field>
            </div>
          )}
        </Card>

        <div className="mt-4 flex justify-between gap-3">
          <button type="button" className={btnGhost} onClick={() => (step === 0 ? navigate('/ordens') : setStep(step - 1))}>
            <ArrowLeft size={16} /> {step === 0 ? 'Cancelar' : 'Voltar'}
          </button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {step < 2 ? (<>Próximo <ArrowRight size={16} /></>) : saving ? 'Salvando...' : (<><Check size={16} /> Abrir Ordem de Serviço</>)}
          </button>
        </div>
      </form>
    </div>
  );
}