import { Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import TablePage from './pages/customer/TablePage';
import MenuPage from './pages/customer/MenuPage';
import CartPage from './pages/customer/CartPage';
import OrderStatusPage from './pages/customer/OrderStatusPage';
import StaffLoginPage from './pages/staff/LoginPage';
import StaffDashboard from './pages/staff/Dashboard';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <CartProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/venue/:venueSlug/table/:tableNumber" element={<TablePage />} />
        <Route path="/venue/:venueSlug/table/:tableNumber/menu" element={<MenuPage />} />
        <Route path="/venue/:venueSlug/table/:tableNumber/cart" element={<CartPage />} />
        <Route path="/order/:orderId" element={<OrderStatusPage />} />
        <Route path="/staff/:venueSlug" element={<StaffLoginPage />} />
        <Route path="/staff/:venueSlug/dashboard" element={<StaffDashboard />} />
      </Routes>
    </CartProvider>
  );
}
