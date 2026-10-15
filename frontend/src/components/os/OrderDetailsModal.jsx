import { useState } from 'react';
import { Modal } from '../ui';
import OrderDetails from './OrderDetails';

// Permite navegar entre OSs relacionadas (ex.: OS original <-> OS de garantia) sem fechar o modal.
export default function OrderDetailsModal({ id, onClose, onChanged }) {
  const [currentId, setCurrentId] = useState(id);
  return (
    <Modal title="Detalhes da ordem de serviço" onClose={onClose} size="xl">
      <OrderDetails key={currentId} id={currentId} onChanged={onChanged} onOpenOrder={setCurrentId} />
    </Modal>
  );
}