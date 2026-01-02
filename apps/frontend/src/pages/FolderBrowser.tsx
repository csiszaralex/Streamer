import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { videoApi } from '../lib/api';
import { Folder, FileVideo, Film, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

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

  if (isLoading) return <div className="text-center p-10 text-gray-400">Loading library...</div>;
  if (error) return <div className="text-center p-10 text-red-500">Error loading folder.</div>;
  if (!data) return null;

  // Breadcrumbs (Navigációs morzsák) generálása
  const crumbs = currentPath.split('/').filter(Boolean);

  return (
    <div>
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-6 text-gray-400 text-sm overflow-x-auto">
        <Link to="/browse" className="hover:text-white transition-colors">Home</Link>
        {crumbs.map((crumb, index) => {
           // Felépítjük a linket az adott szintig
           const pathSoFar = crumbs.slice(0, index + 1).join('/');
           return (
             <div key={pathSoFar} className="flex items-center gap-2">
                <ChevronRight size={14} />
                <Link to={`/browse/${pathSoFar}`} className="hover:text-white transition-colors">
                  {decodeURIComponent(crumb)}
                </Link>
             </div>
           );
        })}
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">

        {/* Vissza gomb (ha nem a gyökérben vagyunk) */}
        {data.parent !== undefined && data.path !== '' && (
           <Link
             to={`/browse/${data.parent}`}
             className="flex flex-col items-center justify-center p-4 bg-surface rounded-xl hover:bg-slate-700 transition-colors group aspect-square border border-slate-700 hover:border-slate-500"
           >
             <div className="mb-2 text-slate-500 group-hover:text-slate-300">
               <Folder size={40} />
             </div>
             <span className="text-sm font-medium text-slate-400">.. (Back)</span>
           </Link>
        )}

        {/* Mappák és Fájlok */}
        {data.entries.map((entry) => {
          const isFolder = entry.type === 'folder';
          // Ha mappa -> /browse/path, ha fájl -> /watch?path=...
          // Figyelj: A backend relatív utat ad (path), azt fűzzük tovább
          const linkTarget = isFolder
             ? `/browse/${entry.path}`
             : `/watch?path=${encodeURIComponent(entry.path)}`; // Ezt majd a Player kezeli

          return (
            <Link
              key={entry.name}
              to={linkTarget}
              className={cn(
                "flex flex-col items-center justify-between p-4 rounded-xl transition-all duration-200 group aspect-square border",
                "bg-surface border-slate-700 hover:bg-slate-700 hover:border-slate-500 hover:scale-105 shadow-lg"
              )}
            >
              <div className="flex-1 flex items-center justify-center w-full">
                 {isFolder ? (
                   <Folder size={48} className="text-yellow-500 group-hover:text-yellow-400 drop-shadow-lg" />
                 ) : (
                   <div className="relative">
                     <Film size={48} className="text-blue-500 group-hover:text-blue-400 drop-shadow-lg" />
                     {/* Itt lehetne badge, ha pl. 4K */}
                   </div>
                 )}
              </div>

              <div className="w-full mt-3 text-center">
                <p className="text-sm font-medium text-gray-200 truncate w-full" title={entry.name}>
                  {entry.name}
                </p>
                {/* Ha fájl, kiírhatnánk méretet is, ha a backend küldené a listában */}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
