# Tabwise — Research, Summarize, and Ship

Tabwise is a research assistant that helps you turn your messy browser tabs into organized research sessions. It uses client-side AI (Gemini Nano / Chrome Built-in AI) to summarize content, generate insights, and help you produce polished, ready-to-submit Devpost demos.

## Key Features

- **Collect Tabs:** Capture your open browser tabs, including URL, title, and content, and save them into organized research sessions.
- **AI-Powered Summaries:** Use the power of on-device AI to automatically summarize long articles, extract key points, and generate citations.
- **Rich Text Editor:** Organize your findings, write drafts, and format your research with a full-featured rich text editor.
- **Team Collaboration:** Work with your team in real-time, share research sessions, and collaborate on drafts.
- **AI Assistant:** Get intelligent suggestions and insights about your research from the built-in AI assistant.
- **Dark/Light Mode:** Choose your preferred theme, which automatically syncs with your system preference.
- **Export to PDF:** Export your research sessions and drafts to PDF for easy sharing and archiving.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (React)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Database:** [Supabase](https://supabase.io/) (PostgreSQL)
- **Authentication:** [Supabase Auth](https://supabase.io/docs/guides/auth)
- **On-Device AI:** [Gemini Nano](https://ai.google.dev/docs/gemini_nano) (via Chrome's built-in AI)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or later)
- [npm](https://www.npmjs.com/)
- A [Supabase](https://supabase.io/) project

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/tabwise.git
    cd tabwise
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

Tabwise also comes with a browser extension to make it even easier to collect your tabs.

### To install the extension:

1.  Navigate to `chrome://extensions` in your Chrome browser.
2.  Enable "Developer mode".
3.  Click "Load unpacked" and select the `src/apps/extension` directory from this project.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
