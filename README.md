🧠 Ideas – Real-time Team Collaboration Platform
Live: https://ideas-wheat.vercel.app
Stack: Next.js, Supabase, Tailwind CSS, TypeScript

📌 Overview
Ideas is a modern team collaboration platform inspired by Notion and Linear. It supports real-time personal and team messaging, team-based posts, and notes that feel like threaded comments. Roles and permissions are in place, with intuitive UI and secure email-based authentication.

✨ Features
🔐 Auth via Supabase (email confirmation, role-based logic)

💬 Real-time direct and team chat with Supabase Realtime

📝 Post & comment system (inspired by threads)

📎 Team join via invite link, searchable only if public

👥 Role system (Owner, Member) with kick/invite

🔔 Notification support (non-push)

🧪 Try it Out
Login with email → Confirm via Gmail → Join or create a team → Start posting or chatting.

📂 Structure
app/ – Next.js App Router-based structure

components/ – Reusable UI components

lib/ – Supabase utils and helpers

types/ – Centralized TypeScript types

🧠 Ideal Use Case
Early-stage team collaboration

Internal note-taking or DM systems

Starter kit for real-time Supabase apps
