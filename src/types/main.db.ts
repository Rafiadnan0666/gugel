
export interface IProfile {
  id: string; 
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: Date;
  updated_at: Date;
}


export interface IResearchSession {
  id: string;
  user_id: string;
  title: string;
  created_at: Date;
}


export interface ITab {
  id: string;
  session_id: string;
  url: string;
  title?: string;
  content?: string; // raw HTML or extracted text
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
  session_id: string;
  content: string;
  version: number;
  created_at: Date;
}


export interface IOfflineCache {
  sessions: IResearchSession[];
  tabs: ITab[];
  summaries: ISummary[];
  drafts: IDraft[];
  last_synced: Date;
}



