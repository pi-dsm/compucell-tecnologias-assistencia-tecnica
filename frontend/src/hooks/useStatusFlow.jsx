import { useState } from 'react';
import api, { errMsg } from '../services/api';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ui';
import ReadyModal from '../components/os/ReadyModal';
import DeliverModal from '../components/os/DeliverModal';
import ReceiptModal from '../components/os/ReceiptModal';

// Regras de transição de status em um único lugar.
// Uso: const { request, modals } = useStatusFlow(reload);  →  request(order, 'ready');  →  {modals}
export default function useStatusFlow(onDone) {
  const toast = useToast();
  const [flow, setFlow] = useState(null); // { type: 'ready' | 'deliver' | 'cancel', order }
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);

  const patchStatus = async (order, status) => {
    setBusy(true);
    try {
      await api.patch(`/service-orders/${order.id}/status`, { status });
      toast.success('Status atualizado');
      onDone?.();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
      setFlow(null);
    }
  };

  const request = (order, status) => {
    if (status === order.status) return;
    switch (status) {
      case 'ready':
        if (order.status !== 'in_repair') return toast.error('Para marcar como pronta, a OS precisa estar em conserto.');
        return setFlow({ type: 'ready', order });
      case 'delivered':
        if (order.status !== 'ready') return toast.error('Só é possível entregar uma OS que está pronta.');
        return setFlow({ type: 'deliver', order });
      case 'cancelled':
        return setFlow({ type: 'cancel', order });
      case 'returned':
        return toast.error('Para registrar um retorno, abra a OS entregue e use "Registrar retorno".');
      default:
        return patchStatus(order, status);
    }
  };

  const close = () => setFlow(null);
  const done = () => {
    setFlow(null);
    onDone?.();
  };

  const modals = (
    <>
      {flow?.type === 'ready' && <ReadyModal order={flow.order} onClose={close} onSaved={done} />}
      {flow?.type === 'deliver' && (
        <DeliverModal
          order={flow.order}
          onClose={close}
          onSaved={(o) => {
            done();
            setReceipt({ id: o.id, number: o.service_order_number }); // termo de garantia ao entregar
          }}
        />
      )}
      {flow?.type === 'cancel' && (
        <ConfirmModal
          title="Cancelar OS"
          message={`Cancelar a OS #${flow.order.service_order_number}? Esta ação não pode ser desfeita.`}
          confirmLabel="Cancelar OS"
          danger
          busy={busy}
          onConfirm={() => patchStatus(flow.order, 'cancelled')}
          onClose={close}
        />
      )}
      {receipt && <ReceiptModal orderId={receipt.id} number={receipt.number} kind="warranty" onClose={() => setReceipt(null)} />}
    </>
  );

  return { request, modals };
}