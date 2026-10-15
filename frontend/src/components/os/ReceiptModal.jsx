import { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, Printer } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { btnGhost, btnPrimary, Modal, Spinner } from '../ui';

const TITLES = { receipt: 'Comprovante de entrada', warranty: 'Termo de garantia' };

// kind: 'receipt' (via do cliente na abertura) | 'warranty' (na entrega)
export default function ReceiptModal({ orderId, kind = 'receipt', number, onClose }) {
  const toast = useToast();
  const frame = useRef(null);
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let objectUrl = null;
    api
      .get(`/service-orders/${orderId}/${kind}.pdf`, { responseType: 'blob' })
      .then((r) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(r.data);
        setUrl(objectUrl);
      })
      .catch(() => toast.error('Não foi possível gerar o documento.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [orderId, kind]);

  const print = () => {
    frame.current?.contentWindow?.focus();
    frame.current?.contentWindow?.print();
  };

  return (
    <Modal title={`${TITLES[kind]}${number ? ` — OS #${number}` : ''}`} onClose={onClose} size="lg">
      {loading ? (
        <Spinner />
      ) : url ? (
        <>
          <iframe ref={frame} src={url} title="Documento" className="h-[60vh] w-full rounded-lg border border-slate-200" />
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <a className={btnGhost} href={url} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir em nova aba</a>
            <a className={btnGhost} href={url} download={`OS-${number || orderId}-${kind}.pdf`}><Download size={16} /> Baixar</a>
            <button className={btnPrimary} onClick={print}><Printer size={16} /> Imprimir</button>
          </div>
        </>
      ) : (
        <p className="py-8 text-center text-sm text-slate-500">Documento indisponível.</p>
      )}
    </Modal>
  );
}