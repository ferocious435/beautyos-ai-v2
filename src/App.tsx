import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';

function App() {
  console.log('App.tsx: Rendering with Router and MainLayout');
  
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={
            <div style={{ color: 'lime', fontSize: '24px', padding: '100px', textAlign: 'center' }}>
              LAYOUT & ROUTER LOADED! 🚀
            </div>
          } />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
