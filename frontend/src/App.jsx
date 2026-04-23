import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './features/auth/components/ProtectedRoute';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import PublicLayout from './layouts/PublicLayout';

// Auth
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import ProductList from './pages/admin/ProductList';
import ProductCreate from './pages/admin/ProductCreate';
import ProductEdit from './pages/admin/ProductEdit';
import CatalogManagement from './pages/admin/CatalogManagement';
import ContactFormConfig from './pages/admin/ContactFormConfig';
import HomepageConfig from './pages/admin/HomepageConfig';
import SimilaritySettings from './pages/admin/SimilaritySettings';
import FooterConfig from './pages/admin/FooterConfig';

// Public pages
import HomePage from './pages/public/HomePage';
import AllProducts from './pages/public/AllProducts';
import ProductDetail from './pages/public/ProductDetail';
import ProductContact from './pages/public/ProductContact';
import MyApps from './pages/public/MyApps';

function AppRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Admin */}
      <Route path="/admin" element={
        <ProtectedRoute adminOnly>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProductCreate />} />
        <Route path="products/:id/edit" element={<ProductEdit />} />
        <Route path="catalog" element={<CatalogManagement />} />
        <Route path="config/contact" element={<ContactFormConfig />} />
        <Route path="config/homepage" element={<HomepageConfig />} />
        <Route path="config/similarity" element={<SimilaritySettings />} />
        <Route path="config/footer" element={<FooterConfig />} />
      </Route>

      {/* Public Routes - Mostly Open */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<AllProducts />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="products/:id/add-lead" element={<ProductContact />} />
        
        {/* Protected Public Routes */}
        <Route path="my-apps" element={
          <ProtectedRoute>
            <MyApps />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
