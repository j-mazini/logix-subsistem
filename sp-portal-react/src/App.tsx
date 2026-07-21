import { HashRouter, Routes, Route } from 'react-router-dom';
import { Profile } from './pages/Profile/Profile';
import { Login } from './pages/Login/Login';
import { Select } from './pages/Select/Select';
import { useViewportAttribute } from './hooks/useViewportAttribute';
import { useRefinementsMotion } from './hooks/useRefinementsMotion';

function App() {
  useViewportAttribute();
  useRefinementsMotion();

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Profile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/select" element={<Select />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
