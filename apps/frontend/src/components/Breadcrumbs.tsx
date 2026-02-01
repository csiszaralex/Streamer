import { ChevronRight } from 'lucide-react';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "./ui/breadcrumb";

interface BreadcrumbsProps {
  currentPath: string;
}

export function Breadcrumbs({ currentPath }: BreadcrumbsProps) {
  const crumbs = currentPath.split('/').filter(Boolean);

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/browse">Home</BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((crumb, index) => {
          // Build path up to current level
          const pathSoFar = crumbs.slice(0, index + 1).join('/');
          const isLast = index === crumbs.length - 1;
          const decodedCrumb = decodeURIComponent(crumb);

          return (
            <div key={pathSoFar} className="flex items-center gap-1.5 sm:gap-2.5">
              <BreadcrumbSeparator>
                 <ChevronRight />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{decodedCrumb}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={`/browse/${pathSoFar}`}>{decodedCrumb}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
