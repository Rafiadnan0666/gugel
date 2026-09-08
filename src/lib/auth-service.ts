import { createClient } from '@/utils/supabase/client';

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email?: string;
    full_name?: string;
  };
  roles?: string[];
  error?: string;
}

export interface AdminAuthResult extends AuthResult {
  isAdmin: boolean;
}

export class AuthService {
  private supabase = createClient();

  async getCurrentUser(): Promise<AuthResult> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();

      if (authError || !user) {
        return { success: false, error: 'Unauthorized' };
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name,
        },
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  async getUserRoles(userId: string): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_role_assignments')
        .select(`
          user_roles!inner(
            name
          )
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }

      return data?.map((assignment: any) => assignment.user_roles.name) || [];
    } catch (error) {
      console.error('Error in getUserRoles:', error);
      return [];
    }
  }

  async hasRole(userId: string, roleName: string): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.includes(roleName);
  }

  async hasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roleNames.some(role => roles.includes(role));
  }

  async requireAdmin(userId: string): Promise<AdminAuthResult> {
    const userResult = await this.getCurrentUser();

    if (!userResult.success) {
      return {
        success: false,
        isAdmin: false,
        error: userResult.error,
      };
    }

    if (!userResult.user) {
      return {
        success: false,
        isAdmin: false,
        error: 'User not found',
      };
    }

    const roles = await this.getUserRoles(userResult.user.id);
    const isAdmin = roles.includes('admin');

    return {
      success: true,
      isAdmin,
      user: userResult.user,
      roles,
      error: !isAdmin ? 'Admin access required' : undefined,
    };
  }

  async logAdminAction(
    adminId: string,
    action: string,
    targetTable: string | null,
    targetId: string | null,
    metadata?: any
  ): Promise<void> {
    try {
      await this.supabase.from('admin_actions').insert({
        admin_id: adminId,
        action,
        target_table: targetTable,
        target_id: targetId,
        metadata,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  }
}

export const authService = new AuthService();
export default authService;
