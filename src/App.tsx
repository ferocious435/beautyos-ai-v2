import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';

function App() {
  console.log('App: Step 1 restoration (Dashboard only)');
  
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<div className="text-white p-8 text-center mt-20">⚙️ הגדרות מערכת - בפיתוח...</div>} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
