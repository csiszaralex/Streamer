import { useQuery } from '@tanstack/react-query';
import { ArrowUpLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { MediaCard } from '../components/MediaCard';
import { Card, CardContent } from '../components/ui/card';
import { videoApi } from '../lib/api';
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

  if (isLoading) return <div className='text-center p-10 text-muted-foreground'>Loading library...</div>;
  if (error) return <div className='text-center p-10 text-destructive'>Error loading folder.</div>;
  if (!data) return null;

  return (
    <div>
      {/* Breadcrumbs */}
      <Breadcrumbs currentPath={currentPath} />

      {/* Grid Layout */}
      <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4'>
        {/* Vissza gomb (ha nem a gyökérben vagyunk) */}
        {data.parent !== undefined && data.path !== '' && (
          <Link to={`/browse/${data.parent}`} className="block group">
            <Card className={cn(
               'flex flex-col items-center justify-center p-4 transition-all duration-200 aspect-square border-border/50',
               'bg-card hover:bg-accent/50 hover:border-accent hover:scale-105 shadow-md hover:shadow-xl'
            )}>
              <CardContent className="flex flex-col items-center justify-center p-0">
                <div className='mb-2 text-muted-foreground group-hover:text-foreground transition-colors'>
                  <ArrowUpLeft size={40} />
                </div>
                <span className='text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors'>.. (Back)</span>
              </CardContent>
            </Card>
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
