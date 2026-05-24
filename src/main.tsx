import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Remove StrictMode in production — it causes double-invocation of effects
// which can break realtime subscriptions
createRoot(document.getElementById('root')!).render(<App />);
