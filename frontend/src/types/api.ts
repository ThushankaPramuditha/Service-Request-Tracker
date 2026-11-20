export type User = { id: number; name: string; email: string };
export type Status = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type ServiceRequest = {
  id: number;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  version: number;
  created_at: string;
  updated_at: string;
};
export type History = {
  id: number;
  service_request_id: number;
  actor_user_id: number;
  from_status: Status;
  to_status: Status;
  remark: string | null;
  created_at: string;
};
export type Data<T> = { data: T };
export type Page<T> = Data<T[]> & {
  meta: { current_page: number; last_page: number; per_page: number; total: number };
  links: Record<string, string | null>;
};
