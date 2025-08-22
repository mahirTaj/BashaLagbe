import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ListingsReview from './pages/ListingsReview';
import Reports from './pages/Reports';
import Users from './pages/Users';
import AuditLog from './pages/AuditLog';
import ProtectedRoute from './utils/ProtectedRoute';

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'listings', element: <ListingsReview /> },
      { path: 'reports', element: <Reports /> },
      { path: 'users', element: <Users /> },
      { path: 'audit', element: <AuditLog /> }
    ]
  }
]);