import { createClient } from '@/utils/supabase/client';
import type { Team, TeamMember, TeamMessage, ResearchSession } from '@/types/main.db';

export interface TeamWithMembers extends Team {
  members: (TeamMember & { profiles: { full_name: string; email: string; avatar_url: string | null } })[];
  member_count: number;
  session_count: number;
  last_activity?: string;
}

export interface TeamStats {
  total_members: number;
  total_sessions: number;
  total_messages: number;
  active_sessions: number;
  member_roles: { owner: number; admin: number; member: number };
}

export class TeamsService {
  private supabase = createClient();

  /**
   * Get all teams for user
   */
  async getUserTeams(userId: string): Promise<TeamWithMembers[]> {
    try {
      const { data: teams, error: teamsError } = await this.supabase
        .from('team_members')
        .select(`
          teams!inner(*),
          role
        `)
        .eq('user_id', userId);

      if (teamsError) throw teamsError;

      const teamIds = teams?.map((t: any) => t.teams.id) || [];
      
      if (teamIds.length === 0) return [];

      // Get members for each team
      const { data: allMembers } = await this.supabase
        .from('team_members')
        .select(`
          team_id,
          role,
          created_at,
          profiles!inner(full_name, email, avatar_url)
        `)
        .in('team_id', teamIds)
        .order('created_at', { ascending: true });

      // Get session counts
      const { data: sessions } = await this.supabase
        .from('research_sessions')
        .select('team_id, created_at')
        .in('team_id', teamIds);

      const teamsWithMembers: TeamWithMembers[] = teams?.map((team: any) => {
        const members = allMembers?.filter(m => m.team_id === team.teams.id) || [];
        const teamSessions = sessions?.filter(s => s.team_id === team.teams.id) || [];
        
        return {
          ...team.teams,
          members: members.map(m => ({
            ...m,
            profiles: m.profiles
          })),
          member_count: members.length,
          session_count: teamSessions.length,
          last_activity: teamSessions.length > 0 
            ? teamSessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
            : undefined
        };
      }) || [];

      return teamsWithMembers;
    } catch (error) {
      console.error('Error fetching user teams:', error);
      return [];
    }
  }

  /**
   * Create a new team
   */
  async createTeam(teamData: {
    name: string;
    description: string;
    visibility?: string;
    ownerId: string;
  }): Promise<Team | null> {
    try {
      const { data, error } = await this.supabase
        .from('teams')
        .insert({
          name: teamData.name,
          description: teamData.description,
          owner_id: teamData.ownerId,
          visibility: teamData.visibility || 'private',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Add owner as team member
      if (data) {
        await this.supabase
          .from('team_members')
          .insert({
            team_id: data.id,
            user_id: teamData.ownerId,
            role: 'owner',
            created_at: new Date().toISOString()
          });
      }

      return data;
    } catch (error) {
      console.error('Error creating team:', error);
      return null;
    }
  }

  /**
   * Invite user to team
   */
  async inviteToTeam(
    teamId: string,
    inviterId: string,
    inviteeEmail: string,
    role: 'admin' | 'member' = 'member'
  ): Promise<boolean> {
    try {
      // Get invitee user by email
      const { data: invitee } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteeEmail)
        .single();

      if (!invitee) {
        throw new Error('User not found with that email');
      }

      // Check if already a member
      const { data: existingMember } = await this.supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('user_id', invitee.id)
        .single();

      if (existingMember) {
        throw new Error('User is already a member of this team');
      }

      // Add team member
      const { error } = await this.supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: invitee.id,
          role,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Send team message
      await this.sendTeamMessage(teamId, inviterId, `invited ${inviteeEmail} to join the team`);

      return true;
    } catch (error) {
      console.error('Error inviting to team:', error);
      return false;
    }
  }

  /**
   * Remove member from team
   */
  async removeMember(teamId: string, memberUserId: string, removerId: string): Promise<boolean> {
    try {
      // Check permissions
      const { data: removerMember } = await this.supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', removerId)
        .single();

      const { data: memberToRemove } = await this.supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', memberUserId)
        .single();

      if (!removerMember || !memberToRemove) {
        throw new Error('Member not found');
      }

      // Only owner can remove, or users can remove themselves
      if (removerMember.role !== 'owner' && removerId !== memberUserId) {
        throw new Error('Insufficient permissions');
      }

      // Remove member
      const { error } = await this.supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', memberUserId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error removing member:', error);
      return false;
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    teamId: string,
    memberUserId: string,
    newRole: 'admin' | 'member',
    updaterId: string
  ): Promise<boolean> {
    try {
      // Check if updater is owner
      const { data: updater } = await this.supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', updaterId)
        .single();

      if (!updater || updater.role !== 'owner') {
        throw new Error('Only team owners can update roles');
      }

      // Update member role
      const { error } = await this.supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('team_id', teamId)
        .eq('user_id', memberUserId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error updating member role:', error);
      return false;
    }
  }

  /**
   * Get team messages
   */
  async getTeamMessages(teamId: string, limit: number = 50): Promise<TeamMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('team_messages')
        .select(`
          *,
          profiles!inner(full_name, avatar_url)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching team messages:', error);
      return [];
    }
  }

  /**
   * Send team message
   */
  async sendTeamMessage(
    teamId: string,
    senderId: string,
    content: string
  ): Promise<TeamMessage | null> {
    try {
      const { data, error } = await this.supabase
        .from('team_messages')
        .insert({
          team_id: teamId,
          user_id: senderId,
          content,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending team message:', error);
      return null;
    }
  }

  /**
   * Get team research sessions
   */
  async getTeamSessions(teamId: string): Promise<ResearchSession[]> {
    try {
      const { data, error } = await this.supabase
        .from('research_sessions')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching team sessions:', error);
      return [];
    }
  }

  /**
   * Create team research session
   */
  async createTeamSession(
    teamId: string,
    userId: string,
    title: string
  ): Promise<ResearchSession | null> {
    try {
      const { data, error } = await this.supabase
        .from('research_sessions')
        .insert({
          user_id: userId,
          title,
          team_id: teamId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating team session:', error);
      return null;
    }
  }

  /**
   * Get team statistics
   */
  async getTeamStats(teamId: string): Promise<TeamStats> {
    try {
      const [membersResult, sessionsResult, messagesResult] = await Promise.all([
        this.supabase
          .from('team_members')
          .select('role')
          .eq('team_id', teamId),
        this.supabase
          .from('research_sessions')
          .select('created_at')
          .eq('team_id', teamId),
        this.supabase
          .from('team_messages')
          .select('created_at')
          .eq('team_id', teamId)
      ]);

      const members = membersResult.data || [];
      const sessions = sessionsResult.data || [];
      const messages = messagesResult.data || [];

      const memberRoles = members.reduce((acc, member) => {
        acc[member.role as keyof typeof acc] = (acc[member.role as keyof typeof acc] || 0) + 1;
        return acc;
      }, { owner: 0, admin: 0, member: 0 } as { owner: number; admin: number; member: number });

      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const activeSessions = sessions.filter(s => new Date(s.created_at) > oneWeekAgo).length;

      return {
        total_members: members.length,
        total_sessions: sessions.length,
        total_messages: messages.length,
        active_sessions: activeSessions,
        member_roles: memberRoles
      };
    } catch (error) {
      console.error('Error fetching team stats:', error);
      return {
        total_members: 0,
        total_sessions: 0,
        total_messages: 0,
        active_sessions: 0,
        member_roles: { owner: 0, admin: 0, member: 0 }
      };
    }
  }

  /**
   * Transfer ownership
   */
  async transferOwnership(
    teamId: string,
    currentOwnerId: string,
    newOwnerId: string
  ): Promise<boolean> {
    try {
      // Verify current owner
      const { data: currentOwner } = await this.supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('user_id', currentOwnerId)
        .eq('role', 'owner')
        .single();

      if (!currentOwner) {
        throw new Error('Current user is not the team owner');
      }

      // Update team owner
      await this.supabase
        .from('teams')
        .update({ owner_id: newOwnerId })
        .eq('id', teamId);

      // Update member roles
      await Promise.all([
        this.supabase
          .from('team_members')
          .update({ role: 'member' })
          .eq('team_id', teamId)
          .eq('user_id', currentOwnerId),
        this.supabase
          .from('team_members')
          .update({ role: 'owner' })
          .eq('team_id', teamId)
          .eq('user_id', newOwnerId)
      ]);

      return true;
    } catch (error) {
      console.error('Error transferring ownership:', error);
      return false;
    }
  }

  /**
   * Delete team
   */
  async deleteTeam(teamId: string, userId: string): Promise<boolean> {
    try {
      // Verify owner
      const { data: member } = await this.supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single();

      if (!member || member.role !== 'owner') {
        throw new Error('Only team owners can delete teams');
      }

      // Delete team (cascade will handle related records)
      const { error } = await this.supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting team:', error);
      return false;
    }
  }
}

// Create singleton instance
export const teamsService = new TeamsService();