import Link from 'next/link';
export function Pagination({ page, last, query }: { page: number; last: number; query: string }) {
  const href = (value: number) => { const params = new URLSearchParams(query); params.set('page', String(value)); return '/requests?' + params; };
  return <nav className="pagination" aria-label="Pagination">
    {page > 1 && <Link className="button secondary" href={href(page - 1)}>Previous</Link>}
    <span>Page {page} of {last}</span>
    {page < last && <Link className="button secondary" href={href(page + 1)}>Next</Link>}
  </nav>;
}
