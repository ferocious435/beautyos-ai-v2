import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import TestPage from './pages/TestPage';

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/settings" element={<div className="text-white p-8">Настройки системы в разработке...</div>} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
