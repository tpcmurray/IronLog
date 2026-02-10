import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BottomNav from './components/layout/BottomNav';
import Toasts from './components/layout/Toasts';
import ConnectionBanner from './components/layout/ConnectionBanner';
import HomePage from './pages/HomePage';
import WorkoutPage from './pages/WorkoutPage';
import HistoryPage from './pages/HistoryPage';
import ExerciseHistoryPage from './pages/ExerciseHistoryPage';
import ProgramPage from './pages/ProgramPage';

const TAB_ROUTES = ['/', '/history', '/program'];

export default function App() {
  return (
    <BrowserRouter>
      <Toasts />
      <ConnectionBanner />
      <Routes>
        <Route path="/" element={<WithNav><HomePage /></WithNav>} />
        <Route path="/history" element={<WithNav><HistoryPage /></WithNav>} />
        <Route path="/program" element={<WithNav><ProgramPage /></WithNav>} />
        <Route path="/workout/:id" element={<WorkoutPage />} />
        <Route path="/history/exercise/:id" element={<ExerciseHistoryPage />} />
      </Routes>
    </BrowserRouter>
  );
}

function WithNav({ children }) {
  return (
    <>
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </>
  );
}
