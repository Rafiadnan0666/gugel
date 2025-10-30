# Gugel — Collaborative Research, Made Simple.

Gugel is a collaborative research platform that helps you and your team organize, analyze, and write about your findings, all in one place.

## Key Features

- **Collaborative Research Sessions:** Create shared research sessions with your team, keeping all your resources in one place.
- **AI-Powered Insights:** Automatically summarize articles, get key insights, and generate citations with built-in AI.
- **Collaborative Drafting:** Write, edit, and comment on research drafts with your team in real-time.
- **Team Management:** Organize your team, manage members, and control access to research sessions.
- **Real-time Collaboration:** See who's online and what they are working on.
- **Notifications:** Stay up-to-date with the latest activity in your research sessions.
- **Dark/Light Mode:** Choose your preferred theme, which automatically syncs with your system preference.
- **Export Your Work:** Export your research sessions and drafts to various formats for easy sharing and archiving.

## Pages and Functionality

### Landing Page

The landing page provides a brief overview of Gugel's features and benefits. It serves as the entry point for new and returning users, with clear calls-to-action to sign in or sign up.

### Authentication

-   **Sign In (`/sign-in`):** Allows existing users to log in to their accounts.
-   **Sign Up (`/sign-up`):** Enables new users to create an account.
-   **Reset Password (`/reset-password`):** Provides a way for users to reset their password if they have forgotten it.
-   **Update Password (`/update-password`):** Allows logged-in users to change their password.

### Core Application

-   **Dashboard (`/dashboard`):** The main hub for users after logging in. It displays recent activity, an overview of research sessions, and quick access to drafts.
-   **AI Research (`/ai/research/[id]`):** A powerful feature where users can leverage AI to analyze and get insights from their research materials within a specific session.
-   **Drafts (`/drafts`):** A list of all research drafts created by the user.
-   **Individual Draft (`/drafts/[id]`):** A collaborative editor for writing and editing a specific draft in real-time with team members.
-   **Notifications (`/notifications`):** Displays a feed of notifications related to research sessions, mentions, and other activities.
-   **Profile (`/profile`):** Allows users to view and manage their personal information.
-   **Research (`/research`):** A page to view and manage all research sessions.
-   **Collaboration Session (`/session/[id]`):** The main workspace for a research session. It includes features like AI chat, content management, and collaboration tools.
-   **Settings (`/settings`):** Users can customize their application preferences, such as theme and notification settings.

### Teams

-   **Create Team (`/team/create`):** Allows users to create a new team and invite members.
-   **Team Dashboard (`/team/[id]`):** Provides an overview of a specific team, including members, research sessions, and activity.
-   **Team Research (`/team/research/[idr]`):** A dedicated space for teams to collaborate on research projects.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (React)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Database:** [Supabase](https://supabase.io/) (PostgreSQL)
- **Authentication:** [Supabase Auth](https://supabase.io/docs/guides/auth)
- **AI:** [Google Gemini](https://ai.google.dev/)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or later)
- [npm](https://www.npmjs.com/)
- A [Supabase](https://supabase.io/) project

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/gugel.git
    cd gugel
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    Create a `.env.local` file in the root of your project and add your Supabase project URL and anon key:

    ```
    NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
    ```

4.  **Run the development server:**

    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Browser Extension

Gugel also comes with a browser extension to make it even easier to collect your tabs and resources.

### To install the extension:

1.  Navigate to `chrome://extensions` in your Chrome browser.
2.  Enable "Developer mode".
3.  Click "Load unpacked" and select the `src/apps/extension` directory from this project.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.