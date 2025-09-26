export interface IProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  settings?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface IResearchSession {
  id: string;
  user_id: string; 
  team_id?: string;
  title: string;
  created_at: Date;
}

export interface ISessionCollaborator {
  id: string;
  session_id: string;
  user_id: string;
  role: "editor" | "viewer";
  created_at: Date;
}

export interface ITab {
  favicon: string;
  id: string;
  session_id: string;
  url: string;
  title?: string;
  content?: string;
  created_at: Date;
}
export interface ISummary {
  id: string;
  tab_id: string;
  summary: string;
  translator?: string;
  proofread?: string;
  created_at: Date;
}

export interface IDraft {
  id: string;
  research_session_id: string;
  content: string;
  version: number;
  created_at: Date;
  user_id?: string;
}

export interface ISessionMessage {
  id: string;
  session_id: string;
  user_id?: string; 
  content: string;
  sender: "user" | "ai";
  created_at: Date;
}

export interface ITeam {
  id: string;
  name: string;
  description?: string;
  visibility ?: "private" | "public";
  owner_id: string;
  created_at: Date;
  updated_at?: Date;
}

export interface ITeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  created_at: Date;
  profiles: IProfile;
}

export interface ITeamMessage {
  id: string;
  team_id: string;
  user_id: string;
  content: string;
  created_at: Date;
  profiles: IProfile;
}

export interface INotification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: Date;
  updated_at: Date;
}


export interface IOfflineCache {
  sessions: IResearchSession[];
  tabs: ITab[];
  summaries: ISummary[];
  drafts: IDraft[];
  messages: ISessionMessage[];
  teams: ITeam[];
  team_members: ITeamMember[];
  team_messages: ITeamMessage[];
  last_synced: Date;
}




