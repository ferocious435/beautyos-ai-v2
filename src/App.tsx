import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';

function App() {
  console.log('App: Rendering minimalist version (No page imports)');
  
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={
            <div style={{ color: 'lime', fontSize: '24px', padding: '100px', textAlign: 'center' }}>
              ISOLATION TEST: APP IS ALIVE! 🟢
              <br/>
              <span style={{ fontSize: '14px', color: 'gray' }}>Page imports removed to find the crash source.</span>
            </div>
          } />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
