import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div style={{ color: '#e0e0e0', padding: '2rem', textAlign: 'center' }}>
      <h1>IronLog</h1>
      <p>App shell loaded. Routing coming in Phase 12.</p>
    </div>
  </StrictMode>
);
