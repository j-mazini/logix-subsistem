import { HashRouter, Routes, Route } from 'react-router-dom';
import { Profile } from './pages/Profile/Profile';
import { useViewportAttribute } from './hooks/useViewportAttribute';
import { useRefinementsMotion } from './hooks/useRefinementsMotion';

function App() {
  useViewportAttribute();
  useRefinementsMotion();

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Profile />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
