export type SystemLogProps = {
  id: string;
  user_id: string;
  action: string;
  description: string | null;
  /** Display name (e.g. from populated ref or static data) */
  user_name?: string;
  user_email?: string;
  createdAt?: string;
  updatedAt?: string;
};
