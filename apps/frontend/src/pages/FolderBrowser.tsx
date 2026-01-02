import { useQuery } from '@tanstack/react-query';
import { Folder } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { MediaCard } from '../components/MediaCard';
import { videoApi } from '../lib/api';

export default function FolderBrowser() {
  // A React Router kiszedi a "*" wildcard tartalmát.
  // Ha üres, undefined lesz -> fallback üres stringre.
  const params = useParams();
  const currentPath = params['*'] || '';

  // Adatlekérés (automata loading/error state kezelés!)
  const { data, isLoading, error } = useQuery({
    queryKey: ['folder', currentPath], // Cache kulcs: ha változik az útvonal, újrahívja
    queryFn: () => videoApi.listFolder(currentPath),
  });

  if (isLoading) return <div className='text-center p-10 text-gray-400'>Loading library...</div>;
  if (error) return <div className='text-center p-10 text-red-500'>Error loading folder.</div>;
  if (!data) return null;

  return (
    <div>
      {/* Breadcrumbs */}
      <Breadcrumbs currentPath={currentPath} />

      {/* Grid Layout */}
      <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4'>
        {/* Vissza gomb (ha nem a gyökérben vagyunk) */}
        {data.parent !== undefined && data.path !== '' && (
          <Link
            to={`/browse/${data.parent}`}
            className='flex flex-col items-center justify-center p-4 bg-surface rounded-xl hover:bg-slate-700 transition-colors group aspect-square border border-slate-700 hover:border-slate-500'
          >
            <div className='mb-2 text-slate-500 group-hover:text-slate-300'>
              <Folder size={40} />
            </div>
            <span className='text-sm font-medium text-slate-400'>.. (Back)</span>
          </Link>
        )}

        {/* Mappák és Fájlok */}
        {data.entries.map((entry) => (
          <MediaCard key={entry.name} entry={entry} />
        ))}
      </div>
    </div>
  );
}
