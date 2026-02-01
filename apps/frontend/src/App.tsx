import { Toaster } from "@/components/ui/sonner";
import { Navigate, Route, Routes } from 'react-router-dom';
import FolderBrowser from './pages/FolderBrowser';
import VideoPlayer from './pages/VideoPlayer';

export function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/browse" replace />} />
        <Route path="/browse/*" element={<FolderBrowser />} />
        <Route path="/watch" element={<VideoPlayer />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
