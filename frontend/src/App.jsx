import { Outlet } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Topbar from './components/Layout/Topbar';
import './styles/theme.css';

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div>
        <Topbar />
        <Outlet />
      </div>
    </div>
  );
}