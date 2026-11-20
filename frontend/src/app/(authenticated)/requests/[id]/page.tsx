'use client';
import { useParams } from 'next/navigation';
import { RequestDetail } from '@/components/request-detail';
export default function Detail() {
  const { id } = useParams<{ id: string }>();
  return <RequestDetail key={id} id={id} />;
}
