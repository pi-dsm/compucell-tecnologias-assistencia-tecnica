import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import OrderDetails from '../components/os/OrderDetails';

export default function ServiceOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link to="/ordens" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700"><ArrowLeft size={16} /> Voltar para as ordens</Link>
      <OrderDetails key={id} id={id} onOpenOrder={(oid) => navigate(`/ordens/${oid}`)} />
    </div>
  );
}