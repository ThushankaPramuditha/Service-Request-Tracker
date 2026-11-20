import { api } from './api';
import type { Data, History, Page, Priority, ServiceRequest, Status } from '@/types/api';
export const listRequests = (query: string, signal?: AbortSignal) =>
  api<Page<ServiceRequest>>('/api/requests?' + query, { signal });
export const getRequest = (id: string, signal?: AbortSignal) =>
  api<Data<ServiceRequest>>('/api/requests/' + id, { signal });
export const getHistory = (id: string, signal?: AbortSignal) =>
  api<Data<History[]>>('/api/requests/' + id + '/history', { signal });
export const createRequest = (data: { title: string; description: string; priority: Priority }) =>
  api<Data<ServiceRequest>>('/api/requests', { method: 'POST', body: JSON.stringify(data) });
export const changeStatus = (
  id: string,
  data: { status: Status; expected_version: number; remark: string },
) =>
  api<Data<ServiceRequest>>('/api/requests/' + id + '/status', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
export const statusLabel = (status: string) =>
  status
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
