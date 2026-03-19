export type Role = 'admin' | 'contributer' | 'reader';

export interface DBUser {
  user_id: number;
  firebase_uid: string;
  email: string;
  name?: string;
  role: Role;
  created_at: string;
}
