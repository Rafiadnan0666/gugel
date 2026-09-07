# Entity Relationship Diagram - Concentra (Eyaya)

## Mermaid ERD

```mermaid
erDiagram
    PROFILES ||--o{ RESEARCH_SESSIONS : "owns"
    PROFILES ||--o{ DRAFTS : "authors"
    PROFILES ||--o{ TABS : "creates"
    PROFILES ||--o{ SESSION_MESSAGES : "sends"
    PROFILES ||--o{ TEAM_MEMBERS : "belongs to"
    PROFILES ||--o{ TEAM_MESSAGES : "posts"
    PROFILES ||--o{ NOTIFICATIONS : "receives"
    PROFILES ||--o{ USER_CREDITS : "has balance"
    PROFILES ||--o{ USER_DEVICES : "uses"
    PROFILES ||--o{ USER_ROLE_ASSIGNMENTS : "assigned"
    PROFILES ||--o{ AI_USAGE_LOGS : "generates"
    PROFILES ||--o{ CREDIT_LEDGER : "transactions"
    PROFILES ||--o{ PAYMENTS : "makes"
    PROFILES ||--o{ INVOICES : "billed"
    PROFILES ||--o{ AI_PROMPTS : "creates"
    PROFILES ||--o{ AITRACE : "traces"

    TEAMS ||--o{ TEAM_MEMBERS : "has"
    TEAMS ||--o{ TEAM_MESSAGES : "contains"
    TEAMS ||--o{ RESEARCH_SESSIONS : "owns"

    RESEARCH_SESSIONS ||--o{ DRAFTS : "has"
    RESEARCH_SESSIONS ||--o{ TABS : "contains"
    RESEARCH_SESSIONS ||--o{ SESSION_COLLABORATORS : "collaborates"
    RESEARCH_SESSIONS ||--o{ SESSION_MESSAGES : "has"
    RESEARCH_SESSIONS ||--o{ SUMMARIES : "generated from"

    DRAFTS ||--o{ COMMENTS : "has"

    TABS ||--o{ SUMMARIES : "summarized"

    AI_PROVIDERS ||--o{ AI_MODELS : "provides"
    AI_MODELS ||--o{ AI_USAGE_LOGS : "used in"
    AI_PROMPTS ||--o{ AI_PROMPT_RESPONSES : "has"
    AI_PROMPT_RESPONSES ||--o{ AI_RESPONSE_FEEDBACK : "receives"

    PAYMENT_GATEWAYS ||--o{ PAYMENT_CUSTOMERS : "has"
    PAYMENT_GATEWAYS ||--o{ PAYMENTS : "processes"
    INVOICES ||--o{ INVOICE_ITEMS : "contains"
    INVOICES ||--o{ PAYMENTS : "paid by"

    ROLES ||--o{ USER_ROLE_ASSIGNMENTS : "assigned"
    ROLES ||--o{ ROLE_AI_QUOTAS : "has limits"

    PROFILES {
        uuid id PK "auth.users.id"
        string email
        string full_name
        string avatar_url
        json settings
        timestamp created_at
        timestamp updated_at
    }

    SETTINGS {
        uuid id PK
        uuid user_id FK
        string theme
        boolean notifications
        string language
        boolean enable_ai_suggestions
        boolean auto_save
        boolean enable_dark_mode
        boolean enable_notifications
        boolean auto_save_drafts
        string default_ai_provider
        string default_ai_model
        timestamp created_at
        timestamp updated_at
    }

    RESEARCH_SESSIONS {
        uuid id PK
        uuid user_id FK
        string title
        uuid team_id FK
        timestamp created_at
    }

    DRAFTS {
        uuid id PK
        uuid session_id FK
        text content
        int version
        timestamp created_at
        uuid user_id FK
    }

    TABS {
        uuid id PK
        uuid session_id FK
        string url
        string title
        text content
        timestamp created_at
        uuid user_id FK
    }

    SESSION_COLLABORATORS {
        uuid id PK
        uuid session_id FK
        uuid user_id FK
        enum role [editor, viewer]
        timestamp created_at
    }

    SESSION_MESSAGES {
        uuid id PK
        uuid session_id FK
        uuid user_id FK
        text content
        enum sender [user, ai]
        timestamp created_at
    }

    SUMMARIES {
        uuid id PK
        uuid tab_id FK
        text summary
        string translator
        text proofread
        timestamp created_at
    }

    COMMENTS {
        uuid id PK
        uuid draft_id FK
        uuid user_id FK
        text content
        timestamp created_at
    }

    TEAMS {
        uuid id PK
        string name
        text description
        uuid owner_id FK
        timestamp created_at
        string visibility
    }

    TEAM_MEMBERS {
        uuid id PK
        uuid team_id FK
        uuid user_id FK
        enum role [owner, admin, member]
        timestamp created_at
    }

    TEAM_MESSAGES {
        uuid id PK
        uuid team_id FK
        uuid user_id FK
        text content
        timestamp created_at
    }

    NOTIFICATIONS {
        bigint id PK
        uuid user_id FK
        string message
        string type
        timestamp created_at
        boolean read
        timestamp updated_at
    }

    USER_CREDITS {
        uuid user_id PK
        numeric balance
        timestamp updated_at
    }

    USER_DEVICES {
        uuid id PK
        uuid user_id FK
        string device_hash
        timestamp last_seen_at
    }

    USER_ROLES {
        uuid id PK
        string name
        text description
        boolean is_default
        timestamp created_at
    }

    USER_ROLE_ASSIGNMENTS {
        uuid id PK
        uuid user_id FK
        uuid role_id FK
        timestamp assigned_at
    }

    AI_PROVIDERS {
        uuid id PK
        string key
        string display_name
        boolean is_paid
        boolean active
        timestamp created_at
    }

    AI_MODELS {
        uuid id PK
        uuid provider_id FK
        string model_key
        int context_limit
        numeric input_cost_per_1k
        numeric output_cost_per_1k
        boolean active
        timestamp created_at
    }

    AI_PROMPTS {
        uuid id PK
        uuid user_id FK
        text prompt
        string domain
        timestamp created_at
    }

    AI_PROMPT_RESPONSES {
        uuid id PK
        uuid prompt_id FK
        uuid provider_id FK
        uuid model_id FK
        text response
        bigint latency_ms
        timestamp created_at
    }

    AI_RESPONSE_FEEDBACK {
        uuid id PK
        uuid response_id FK
        uuid user_id FK
        int clarity
        int accuracy
        int simplicity
        int usefulness
        boolean is_winner
        timestamp created_at
    }

    AI_USAGE_LOGS {
        uuid id PK
        uuid user_id FK
        uuid provider_id FK
        uuid model_id FK
        uuid session_id FK
        bigint input_tokens
        bigint output_tokens
        bigint total_tokens
        numeric cost
        timestamp created_at
    }

    AITRACE {
        uuid id PK
        uuid user_id FK
        uuid session_id FK
        text prompt
        text response
        string model_used
        bigint tokens_used
        numeric cost
        timestamp created_at
    }

    PAYMENT_GATEWAYS {
        uuid id PK
        string name
        boolean active
        timestamp created_at
    }

    PAYMENT_CUSTOMERS {
        uuid id PK
        uuid user_id FK
        uuid gateway_id FK
        string external_customer_id
        timestamp created_at
    }

    PAYMENTS {
        uuid id PK
        uuid user_id FK
        uuid invoice_id FK
        uuid gateway_id FK
        numeric amount
        string currency
        enum status [pending, success, failed, refunded]
        string external_payment_id
        json raw_response
        timestamp created_at
        timestamp paid_at
    }

    INVOICES {
        uuid id PK
        uuid user_id FK
        timestamp period_start
        timestamp period_end
        numeric subtotal
        enum status [draft, issued, paid, overdue]
        timestamp created_at
    }

    INVOICE_ITEMS {
        uuid id PK
        uuid invoice_id FK
        string description
        numeric quantity
        numeric unit_price
        numeric total
    }

    CREDIT_LEDGER {
        uuid id PK
        uuid user_id FK
        enum source [payment, ai_usage, admin_adjustment, refund]
        uuid reference_id FK
        numeric amount
        numeric balance_after
        timestamp created_at
    }

    ROLE_AI_QUOTAS {
        uuid id PK
        uuid role_id FK
        uuid provider_id FK
        bigint monthly_token_limit
        boolean hard_stop
        numeric price_per_1k
        timestamp created_at
    }

    ADMIN_ACTIONS {
        uuid id PK
        uuid admin_id FK
        string action
        string target_table
        uuid target_id
        json metadata
        timestamp created_at
    }
```

## Table Relationships Summary

### Core Entities
| Table | Primary Key | Foreign Keys | Description |
|-------|-------------|--------------|-------------|
| `profiles` | `id` (uuid) | References `auth.users.id` | User profiles with settings |
| `settings` | `id` (uuid) | `user_id` → `profiles.id` | User preferences |
| `research_sessions` | `id` (uuid) | `user_id`, `team_id` | Research project containers |
| `drafts` | `id` (uuid) | `session_id`, `user_id` | Collaborative documents |
| `tabs` | `id` (uuid) | `session_id`, `user_id` | Collected research sources |
| `session_collaborators` | `id` (uuid) | `session_id`, `user_id` | Real-time collaboration |
| `session_messages` | `id` (uuid) | `session_id`, `user_id` | Chat messages (user/AI) |
| `summaries` | `id` (uuid) | `tab_id` | AI-generated summaries |
| `comments` | `id` (uuid) | `draft_id`, `user_id` | Draft comments |

### Team & Organization
| Table | Primary Key | Foreign Keys | Description |
|-------|-------------|--------------|-------------|
| `teams` | `id` (uuid) | `owner_id` → `profiles.id` | Team workspaces |
| `team_members` | `id` (uuid) | `team_id`, `user_id` | Team membership with roles |
| `team_messages` | `id` (uuid) | `team_id`, `user_id` | Team chat |

### AI & Analytics
| Table | Primary Key | Foreign Keys | Description |
|-------|-------------|--------------|-------------|
| `ai_providers` | `id` (uuid) | - | AI service providers (Gemini, OpenAI, etc.) |
| `ai_models` | `id` (uuid) | `provider_id` | Specific models per provider |
| `ai_prompts` | `id` (uuid) | `user_id` | User prompts |
| `ai_prompt_responses` | `id` (uuid) | `prompt_id`, `provider_id`, `model_id` | AI responses |
| `ai_response_feedback` | `id` (uuid) | `response_id`, `user_id` | Quality ratings |
| `ai_usage_logs` | `id` (uuid) | `user_id`, `provider_id`, `model_id`, `session_id` | Token usage tracking |
| `aitrace` | `id` (uuid) | `user_id`, `session_id` | Detailed AI traces |

### Billing & Payments
| Table | Primary Key | Foreign Keys | Description |
|-------|-------------|--------------|-------------|
| `payment_gateways` | `id` (uuid) | - | Midtrans, Stripe, etc. |
| `payment_customers` | `id` (uuid) | `user_id`, `gateway_id` | Gateway customer mappings |
| `payments` | `id` (uuid) | `user_id`, `invoice_id`, `gateway_id` | Payment transactions |
| `invoices` | `id` (uuid) | `user_id` | Billing invoices |
| `invoice_items` | `id` (uuid) | `invoice_id` | Invoice line items |
| `credit_ledger` | `id` (uuid) | `user_id`, `reference_id` | Credit transactions |
| `user_credits` | `user_id` (uuid) | - | Current credit balance |

### Auth & Access Control
| Table | Primary Key | Foreign Keys | Description |
|-------|-------------|--------------|-------------|
| `user_roles` | `id` (uuid) | - | Role definitions |
| `user_role_assignments` | `id` (uuid) | `user_id`, `role_id` | User-role mappings |
| `role_ai_quotas` | `id` (uuid) | `role_id`, `provider_id` | Per-role AI limits |
| `user_devices` | `id` (uuid) | `user_id` | Device tracking |

### System
| Table | Primary Key | Foreign Keys | Description |
|-------|-------------|--------------|-------------|
| `notifications` | `id` (bigint) | `user_id` | Notification feed |
| `admin_actions` | `id` (uuid) | `admin_id` | Audit log |

## Key Relationships

1. **User → Research Sessions** (One-to-Many): Users own research sessions
2. **Research Session → Drafts/Tabs/Messages** (One-to-Many): Sessions contain content
3. **Research Session → Collaborators** (Many-to-Many): Real-time collaboration
4. **Team → Members** (One-to-Many): Team membership with roles
5. **Team → Research Sessions** (One-to-Many): Team-owned sessions
6. **AI Provider → Models** (One-to-Many): Provider model catalog
7. **AI Prompt → Responses** (One-to-Many): Prompt-response pairs
8. **Payment Gateway → Customers/Payments** (One-to-Many): Payment processing
9. **Invoice → Items/Payments** (One-to-Many): Billing details
10. **User → Credit Ledger** (One-to-Many): Transaction history

## Supabase RLS Patterns

```sql
-- Profile: public read, owner write
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_owner_write" ON profiles FOR ALL USING (auth.uid() = id);

-- Research Sessions: owner + collaborators
CREATE POLICY "sessions_owner" ON research_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "sessions_collaborator" ON research_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM session_collaborators WHERE session_id = id AND user_id = auth.uid())
);

-- Team Members: team owner/admin manage, members view
CREATE POLICY "team_members_manage" ON team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM team_members WHERE team_id = team_members.team_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
);
```

## Indexes

```sql
-- Research Sessions
CREATE INDEX idx_sessions_user_created ON research_sessions (user_id, created_at DESC);
CREATE INDEX idx_sessions_team_created ON research_sessions (team_id, created_at DESC);

-- Drafts
CREATE INDEX idx_drafts_session_version ON drafts (session_id, version);

-- Tabs
CREATE INDEX idx_tabs_session ON tabs (session_id);

-- Session Messages
CREATE INDEX idx_messages_session_created ON session_messages (session_id, created_at);

-- Collaborators
CREATE INDEX idx_collaborators_session ON session_collaborators (session_id);
CREATE INDEX idx_collaborators_user ON session_collaborators (user_id);

-- AI Usage Logs
CREATE INDEX idx_ai_usage_user_created ON ai_usage_logs (user_id, created_at DESC);
CREATE INDEX idx_ai_usage_session ON ai_usage_logs (session_id);

-- Notifications
CREATE INDEX idx_notifications_user_read ON notifications (user_id, read);
CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);

-- Payments
CREATE INDEX idx_payments_user_status ON payments (user_id, status);
CREATE INDEX idx_payments_gateway_external ON payments (gateway_id, external_payment_id);
```

## Data Flow

```
User Action (Next.js Server Components) → Supabase (PostgreSQL)
     ↓
Supabase Realtime → Connected Clients (Live Collaboration)
     ↓
Google Gemini API → AI Insights (Summaries, Analysis)
     ↓
Results Stored → Supabase → Real-time Sync
```