import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { inputCls } from './ui';
import SupplierFormModal from './SupplierFormModal';

const NEW = '__new__';

// Lista suspensa ligada à lista de fornecedores ativos. Permite cadastrar um novo sem sair da tela.
// optional: mostra "— Sem fornecedor —". fallbackName: exibido se o valor atual for de um fornecedor inativo.
export default function SupplierSelect({ value, onChange, optional = false, fallbackName }) {
  const [list, setList] = useState([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(
    () => api.get('/suppliers', { params: { status: 'active', limit: 500 } }).then((r) => setList(r.data)).catch(() => {}),
    []
  );
  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (e) => {
    if (e.target.value === NEW) setCreating(true);
    else onChange(e.target.value);
  };

  return (
    <>
      <select className={inputCls} value={value || ''} onChange={handleChange}>
        <option value="">{optional ? '— Sem fornecedor —' : 'Selecione o fornecedor…'}</option>
        {value && !list.some((s) => s.id === value) && <option value={value}>{fallbackName || 'Fornecedor inativo'}</option>}
        {list.map((s) => <option key={s.id} value={s.id}>{s.name}{s.city ? ` · ${s.city}` : ''}</option>)}
        <option value={NEW}>＋ Cadastrar novo fornecedor…</option>
      </select>
      {creating && (
        <SupplierFormModal
          onClose={() => setCreating(false)}
          onSaved={(s) => {
            setCreating(false);
            load().then(() => onChange(s.id));
          }}
        />
      )}
    </>
  );
}