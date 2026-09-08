import { createClient } from '@/utils/supabase/client';
import { UserRole, UserRoleAssignment } from '@/types/main.db';

export interface UserWithRoles {
  id: string;
  email: string;
  full_name?: string;
  roles: UserRole[];
}

export class RoleService {
  private supabase = createClient();

  async getUserRoles(userId: string): Promise<UserRole[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_role_assignments')
        .select(`
          user_roles!inner(
            id,
            name,
            description,
            is_default,
            created_at
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      return data?.map((assignment: any) => assignment.user_roles) || [];
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
  }

  async hasRole(userId: string, roleName: string): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.some(role => role.name === roleName);
  }

  async hasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roleNames.some(roleName => 
      roles.some(role => role.name === roleName)
    );
  }

  async isAdmin(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'admin');
  }

  async assignRole(userId: string, roleId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_role_assignments')
        .insert({
          user_id: userId,
          role_id: roleId,
          assigned_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error assigning role:', error);
      return false;
    }
  }

  async removeRole(userId: string, roleId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_role_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing role:', error);
      return false;
    }
  }

  async getAllRoles(): Promise<UserRole[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all roles:', error);
      return [];
    }
  }

  async createRole(name: string, description?: string, isDefault?: boolean): Promise<UserRole | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_roles')
        .insert({
          name,
          description,
          is_default: isDefault || false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating role:', error);
      return null;
    }
  }

  async getUsersWithRole(roleId: string): Promise<UserWithRoles[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_role_assignments')
        .select(`
          user_id,
          profiles!inner(
            id,
            email,
            full_name,
            avatar_url
          ),
          user_roles!inner(
            id,
            name,
            description,
            is_default
          )
        `)
        .eq('role_id', roleId);

      if (error) throw error;

      const usersMap = new Map<string, UserWithRoles>();

      data?.forEach((assignment: any) => {
        const userId = assignment.user_id;
        const profile = assignment.profiles;
        const role = assignment.user_roles;

        if (!usersMap.has(userId)) {
          usersMap.set(userId, {
            id: profile.id,
            email: profile.email || '',
            full_name: profile.full_name || undefined,
            roles: []
          });
        }

        const user = usersMap.get(userId)!;
        user.roles.push(role);
      });

      return Array.from(usersMap.values());
    } catch (error) {
      console.error('Error fetching users with role:', error);
      return [];
    }
  }
}

export const roleService = new RoleService();
export default roleService;