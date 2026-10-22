import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ServiceOrders from './pages/ServiceOrders.jsx';
import NewServiceOrder from './pages/NewServiceOrder.jsx';
import ServiceOrderDetails from './pages/ServiceOrderDetails.jsx';
import NewSale from './pages/NewSale.jsx';
import SalesHistory from './pages/SalesHistory.jsx';
import Users from './pages/Users.jsx';
import PublicTracking from './pages/PublicTracking.jsx';
import Products from './pages/Products.jsx';
import Services from './pages/Services.jsx';
import Holidays from './pages/Holidays.jsx';
import Suppliers from './pages/Suppliers.jsx';
import SalesDaily from './pages/SalesDaily.jsx';
import SalesDashboard from './pages/SalesDashboard.jsx';

function Protected({ children, admin = false }) {
  const { token, isAdmin } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (admin && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/consulta" element={<PublicTracking />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="ordens" element={<ServiceOrders />} />
        <Route path="ordens/nova" element={<NewServiceOrder />} />
        <Route path="ordens/:id" element={<ServiceOrderDetails />} />
        <Route path="vendas" element={<SalesHistory />} />
        <Route path="vendas/nova" element={<NewSale />} />
        <Route path="vendas/detalhado" element={<Protected admin><SalesDaily /></Protected>} />
        <Route path="vendas/dashboard" element={<Protected admin><SalesDashboard /></Protected>} />
        <Route path="produtos" element={<Products />} />
        <Route path="servicos" element={<Services />} />
        <Route path="fornecedores" element={<Suppliers />} />
        <Route path="usuarios" element={<Protected admin><Users /></Protected>} />
        <Route path="feriados" element={<Protected admin><Holidays /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}