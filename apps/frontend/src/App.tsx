import { Navigate, Route, Routes } from 'react-router-dom';
import FolderBrowser from './pages/FolderBrowser';
import VideoPlayer from './pages/VideoPlayer';

function App() {
  return (
    <div className='min-h-screen font-sans'>
      {/* <nav className='p-4 bg-surface shadow-md flex items-center gap-4'>
        <h1 className='text-2xl font-bold text-red-500 tracking-tighter'>PETFLIX</h1>
      </nav> */}

      <main className='p-4'>
        <Routes>
          <Route path='/' element={<Navigate to='/browse' replace />} />
          <Route path='/browse/*' element={<FolderBrowser />} />
          <Route path='/watch' element={<VideoPlayer />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

