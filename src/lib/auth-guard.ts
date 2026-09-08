import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export async function requireAdmin() {
  const supabase = createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    redirect('/sign-in');
  }

  const { data: userRoles, error: rolesError } = await supabase
    .from('user_role_assignments')
    .select('user_roles!inner(name)')
    .eq('user_id', session.user.id);

  if (rolesError) {
    console.error('Error checking user roles:', rolesError);
    redirect('/sign-in');
  }

  const isAdmin = userRoles?.some((assignment: any) =>
    assignment.user_roles.name === 'admin'
  );

  if (!isAdmin) {
    redirect('/dashboard');
  }

  return {
    user: session.user,
    roles: userRoles?.map((r: any) => r.user_roles.name) || [],
  };
}

export async function requireAuth() {
  const supabase = createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    redirect('/sign-in');
  }

  return session.user;
}

export async function getUserRoles(userId: string) {
  const supabase = createClient();

  const { data: userRoles, error: rolesError } = await supabase
    .from('user_role_assignments')
    .select('user_roles!inner(*)')
    .eq('user_id', userId);

  if (rolesError) {
    console.error('Error fetching user roles:', rolesError);
    return [];
  }

  return userRoles?.map((r: any) => r.user_roles) || [];
}
