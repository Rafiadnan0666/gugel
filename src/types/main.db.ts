

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UUID = string;



export type CreditLedgerSource = 'payment' | 'ai_usage' | 'admin_adjustment' | 'refund';
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';
export type SessionCollaboratorRole = 'editor' | 'viewer';
export type MessageSender = 'user' | 'ai';
export type TeamMemberRole = 'owner' | 'admin' | 'member';



export interface AdminAction {
  id: UUID;
  admin_id: UUID;
  action: string;
  target_table: string | null;
  target_id: UUID | null;
  metadata: Json | null;
  created_at: Date | null;
}

export interface AiModel {
  id: UUID;
  provider_id: UUID;
  model_key: string;
  context_limit: number;
  input_cost_per_1k: number | null;
  output_cost_per_1k: number | null;
  active: boolean | null;
  created_at: Date | null;
}

export interface AiPromptResponse {
  id: UUID;
  prompt_id: UUID;
  provider_id: UUID;
  model_id: UUID;
  response: string;
  latency_ms: number | null;
  created_at: Date | null;
}

export interface AiPrompt {
  id: UUID;
  user_id: UUID;
  prompt: string;
  domain: string | null;
  created_at: Date | null;
}

export interface AiProvider {
  id: UUID;
  key: string;
  display_name: string;
  is_paid: boolean | null;
  active: boolean | null;
  created_at: Date | null;
}

export interface AiResponseFeedback {
  id: UUID;
  response_id: UUID;
  user_id: UUID | null;
  clarity: number | null;     
  accuracy: number | null;    
  simplicity: number | null;  
  usefulness: number | null;  
  is_winner: boolean | null;
  created_at: Date | null;
}

export interface AiUsageLog {
  id: UUID;
  user_id: UUID;
  provider_id: UUID;
  model_id: UUID | null;
  session_id: UUID | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  cost: number | null;
  created_at: Date | null;
}

export interface CreditLedger {
  id: UUID;
  user_id: UUID;
  source: CreditLedgerSource;
  reference_id: UUID | null;
  amount: number;
  balance_after: number;
  created_at: Date | null;
}

export interface InvoiceItem {
  id: UUID;
  invoice_id: UUID;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  total: number | null;
}

export interface Invoice {
  id: UUID;
  user_id: UUID;
  period_start: Date | null;
  period_end: Date | null;
  subtotal: number | null;
  status: InvoiceStatus | null;
  created_at: Date | null;
}

export interface Notification {
  id: number; // BigInt in DB
  user_id: UUID | null;
  message: string | null;
  type: string | null;
  created_at: Date | null;
  read: boolean | null;
  updated_at: Date | null;
}

export interface PaymentCustomer {
  id: UUID;
  user_id: UUID;
  gateway_id: UUID;
  external_customer_id: string;
  created_at: Date | null;
}

export interface PaymentGateway {
  id: UUID;
  name: string;
  active: boolean | null;
  created_at: Date | null;
}

export interface Payment {
  id: UUID;
  user_id: UUID;
  invoice_id: UUID;
  gateway_id: UUID;
  amount: number;
  currency: string | null; 
  status: PaymentStatus | null;
  external_payment_id: string | null;
  raw_response: Json | null;
  created_at: Date | null;
  paid_at: Date | null;
}

export interface Profile {
  id: UUID;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  settings: Json | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface ResearchSession {
  id: UUID;
  user_id: UUID;
  title: string;
  created_at: Date | null;
  team_id: UUID | null;
}

export interface RoleAiQuota {
  id: UUID;
  role_id: UUID;
  provider_id: UUID;
  monthly_token_limit: number | null; 
  hard_stop: boolean | null;
  price_per_1k: number | null;
  created_at: Date | null;
}

export interface SessionCollaborator {
  id: UUID;
  session_id: UUID;
  user_id: UUID;
  role: SessionCollaboratorRole | null;
  created_at: Date | null;
}

export interface SessionMessage {
  id: UUID;
  session_id: UUID;
  user_id: UUID | null;
  content: string;
  sender: MessageSender | null;
  created_at: Date | null;
}

export interface Summary {
  id: UUID;
  tab_id: UUID | null;
  summary: string;
  translator: string | null;
  proofread: string | null;
  created_at: Date | null;
}

export interface Tab {
  id: UUID;
  session_id: UUID | null;
  url: string;
  title: string | null;
  content: string | null;
  created_at: Date | null;
  user_id: UUID | null;
}

export interface TeamMember {
  id: UUID;
  team_id: UUID;
  user_id: UUID;
  role: TeamMemberRole | null;
  created_at: Date | null;
  profiles?: Profile;
}

export interface TeamMessage {
  id: UUID;
  team_id: UUID;
  user_id: UUID;
  content: string;
  created_at: Date | null;
  profiles?: Profile;
}

export interface Team {
  id: UUID;
  name: string;
  description: string | null;
  owner_id: UUID;
  created_at: Date | null;
  visibility: string | null;
}

export interface UserCredit {
  user_id: UUID;
  balance: number;
  updated_at: Date | null;
}

export interface UserDevice {
  id: UUID;
  user_id: UUID;
  device_hash: string;
  last_seen_at: Date | null;
}

export interface UserRoleAssignment {
  id: UUID;
  user_id: UUID;
  role_id: UUID;
  assigned_at: Date | null;
}

export interface UserRole {
  id: UUID;
  name: string;
  description: string | null;
  is_default: boolean | null;
  created_at: Date | null;
}


export interface Draft {
  id: UUID;
  session_id: UUID;
  content: string;
  version: number;
  created_at: Date;
  user_id: UUID;
}

export interface Comment {
  id: UUID;
  draft_id: UUID;
  user_id: UUID;
  content: string;
  created_at: Date;
}


export interface Settings {
  id: UUID;
  user_id: UUID;
  theme: string;
  notifications: boolean;
  language: string;
  enable_ai_suggestions?: boolean;
  auto_save?: boolean;
  enable_dark_mode?: boolean;
  enable_notifications?: boolean;
  auto_save_drafts?: boolean;
  default_ai_provider?: string;
  default_ai_model?: string;
  created_at: Date;
  updated_at: Date;
}


export interface AnalyticsData {
  sessions_count: number;
  tabs_count: number;
  drafts_count: number;
  collaborators_count: number;
  activity_timeline: Array<{
    date: string;
    count: number;
  }>;
  sessionsCreated?: number;
  weeklyActivity?: Array<{
    day: string;
    sessions: number;
    messages: number;
  }>;
  messagesSent?: number;
  activeMembers?: number;
  engagementRate?: number;
}


export interface PresenceUser {
  user_id: UUID;
  name: string;
  avatar_url: string | null;
  online_at: Date;
  last_seen: Date;
  profile?: Profile;
  status?: 'online' | 'offline' | 'away';
}


export interface RealTimeEvent {
  id: UUID;
  type: 'user_join' | 'user_leave' | 'message' | 'tab_update' | 'draft_update';
  user_id: UUID;
  data: Json;
  created_at: Date;
  user?: {
    full_name: string;
  };
  timestamp?: Date;
}


export interface AITrace {
  id: UUID;
  user_id: UUID;
  session_id: UUID | null;
  prompt: string;
  response: string;
  model_used: string;
  tokens_used: number;
  cost: number;
  created_at: Date;
}


export interface ITeamMemberWithTeam extends TeamMember {
  teams: Team;
}

export interface IDraftWithResearchSession extends Draft {
  research_sessions: ResearchSession;
}



export interface Database {
  admin_actions: AdminAction;
  ai_models: AiModel;
  ai_prompt_responses: AiPromptResponse;
  ai_prompts: AiPrompt;
  ai_providers: AiProvider;
  ai_response_feedback: AiResponseFeedback;
  ai_usage_logs: AiUsageLog;
  credit_ledger: CreditLedger;
  invoice_items: InvoiceItem;
  invoices: Invoice;
  notifications: Notification;
  payment_customers: PaymentCustomer;
  payment_gateways: PaymentGateway;
  payments: Payment;
  profiles: Profile;
  research_sessions: ResearchSession;
  role_ai_quotas: RoleAiQuota;
  session_collaborators: SessionCollaborator;
  session_messages: SessionMessage;
  summaries: Summary;
  tabs: Tab;
  team_members: TeamMember;
  team_messages: TeamMessage;
  teams: Team;
  user_credits: UserCredit;
  user_devices: UserDevice;
  user_role_assignments: UserRoleAssignment;
  user_roles: UserRole;
}