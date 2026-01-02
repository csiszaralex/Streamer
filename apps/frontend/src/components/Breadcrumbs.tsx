import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BreadcrumbsProps {
  currentPath: string;
}

export function Breadcrumbs({ currentPath }: BreadcrumbsProps) {
  const crumbs = currentPath.split('/').filter(Boolean);

  return (
    <div className='flex items-center gap-2 mb-6 text-gray-400 text-sm overflow-x-auto'>
      <Link to='/browse' className='hover:text-white transition-colors'>
        Home
      </Link>
      {crumbs.map((crumb, index) => {
        // Build path up to current level
        const pathSoFar = crumbs.slice(0, index + 1).join('/');
        return (
          <div key={pathSoFar} className='flex items-center gap-2'>
            <ChevronRight size={14} />
            <Link to={`/browse/${pathSoFar}`} className='hover:text-white transition-colors'>
              {decodeURIComponent(crumb)}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
