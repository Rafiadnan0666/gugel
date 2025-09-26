'use client';

import React from 'react';
import Head from 'next/head';
import { FiArrowRight, FiExternalLink, FiGithub, FiCheckCircle, FiCalendar, FiZap } from 'react-icons/fi';

export default function LandingPageTabwise() {
  return (
    <div className="min-h-screen font-sans antialiased bg-background text-foreground">
      <Head>
        <title>Tabwise — Research, Summarize, and Ship</title>
        <meta name="description" content="Tabwise — Turn your messy browser tabs into organized, AI-powered research sessions." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-card/80 dark:bg-card/50 backdrop-blur-lg border-b border-border/50 fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">T</div>
            <div>
              <div className="text-lg font-extrabold">Tabwise</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <a href="#features" className="hover:text-primary">Features</a>
            <a href="#how" className="hover:text-primary">How It Works</a>
            <a href="#devpost" className="hover:text-primary">Devpost</a>
            <a href="/dashboard" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full hover:bg-primary/90 transition-colors"><span>Live Demo</span> <FiArrowRight/></a>
          </nav>
          <div className="md:hidden text-sm">Menu</div>
        </div>
      </header>

      <div className="running-text-container bg-primary text-primary-foreground py-2 mt-16">
        <div className="running-text">
          <span className="mx-8">Built for the Google Chrome Built-in AI Challenge 2025</span>
          <FiZap className="inline-block mx-2"/>
          <span className="mx-8">Client-side AI for privacy and speed</span>
          <FiZap className="inline-block mx-2"/>
          <span className="mx-8">From messy tabs to crisp research</span>
        </div>
      </div>

      <main className="container mx-auto px-6 py-16">
        <section className="text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight bg-gradient-to-r from-primary to-secondary-foreground text-transparent bg-clip-text">Turn Mess Into Magic</h1>
          <p className="mt-4 text-lg max-w-3xl mx-auto text-muted-foreground">Tabwise is your personal research assistant that transforms your chaotic browser tabs into organized, AI-powered research sessions. Collect, summarize, and ship your findings with ease.</p>
          <div className="mt-8 flex justify-center gap-4">
            <a href="/dashboard" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold text-lg hover:bg-primary/90 transition-transform transform hover:scale-105"><span>Get Started</span><FiArrowRight /></a>
            <a href="#how" className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-full font-semibold text-lg hover:bg-accent transition-colors">Learn More</a>
          </div>
        </section>

        <section id="features" className="mt-24">
          <div className="text-center">
            <h2 className="text-4xl font-bold">Features That Fuel Your Flow</h2>
            <p className="mt-2 text-muted-foreground">Everything you need to streamline your research process.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-8">
            <div className="bg-card p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-border/50 transform hover:-translate-y-1">
              <FiCheckCircle className="text-green-500 text-3xl mb-4" />
              <h3 className="font-bold text-xl">One-Click Collection</h3>
              <p className="mt-2 text-sm text-muted-foreground">Capture open tabs, including URLs, titles, and content, and save them into organized research sessions with a single click.</p>
            </div>
            <div className="bg-card p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-border/50 transform hover:-translate-y-1">
              <FiZap className="text-yellow-500 text-3xl mb-4" />
              <h3 className="font-bold text-xl">AI-Powered Summaries</h3>
              <p className="mt-2 text-sm text-muted-foreground">Leverage on-device AI to automatically summarize long articles, extract key points, and generate citations, all while keeping your data private.</p>
            </div>
            <div className="bg-card p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-border/50 transform hover:-translate-y-1">
              <FiGithub className="text-purple-500 text-3xl mb-4" />
              <h3 className="font-bold text-xl">Devpost-Ready Exports</h3>
              <p className="mt-2 text-sm text-muted-foreground">Generate submission-ready assets, including a GitHub repository scaffold, a `README.md` file for your Devpost description, and a 3-minute video script.</p>
            </div>
          </div>
        </section>

        <section id="how" className="mt-24 text-center">
          <h2 className="text-4xl font-bold">How It Works</h2>
          <p className="mt-2 text-muted-foreground">A simple, three-step process to research enlightenment.</p>
          <div className="mt-12 flex flex-col md:flex-row justify-center items-center gap-8">
            <div className="text-6xl font-extrabold text-primary/20">1</div>
            <p className="max-w-md text-lg">Install the Chrome extension or open the web app and click **Collect Tabs** to snapshot your current research session.</p>
          </div>
          <div className="mt-8 flex flex-col md:flex-row justify-center items-center gap-8">
            <div className="text-6xl font-extrabold text-primary/20">2</div>
            <p className="max-w-md text-lg">Run **Summarize** to let the on-device AI extract key insights, bullet points, and citations from your collected tabs.</p>
          </div>
          <div className="mt-8 flex flex-col md:flex-row justify-center items-center gap-8">
            <div className="text-6xl font-extrabold text-primary/20">3</div>
            <p className="max-w-md text-lg">Use **Generate Devpost** to create a complete submission package, including a video script and GitHub repo.</p>
          </div>
        </section>

        <section id="devpost" className="mt-24 bg-card p-8 rounded-2xl shadow-lg border border-border/50">
          <h2 className="text-3xl font-bold text-center">Devpost Submission-Ready</h2>
          <p className="mt-2 text-muted-foreground text-center">Tabwise is built to help you win. Here's how we align with the Devpost submission checklist.</p>
          <div className="mt-8 grid md:grid-cols-2 gap-8">
            <ul className="space-y-4 text-muted-foreground">
              <li className="flex items-start gap-3"><FiCheckCircle className="text-green-500 mt-1"/><span>**Original Project:** Built from the ground up for the 2025 challenge.</span></li>
              <li className="flex items-start gap-3"><FiCheckCircle className="text-green-500 mt-1"/><span>**Demo Video:** Generate a script for a sub-3-minute video showcasing on-device AI.</span></li>
              <li className="flex items-start gap-3"><FiCheckCircle className="text-green-500 mt-1"/><span>**Public Repo:** Export a GitHub repo with an open-source license and setup instructions.</span></li>
              <li className="flex items-start gap-3"><FiCheckCircle className="text-green-500 mt-1"/><span>**Working Demo:** A live, functional web application to demonstrate the power of Tabwise.</span></li>
            </ul>
            <div className="bg-background p-6 rounded-lg">
              <h4 className="font-semibold">Judging Highlights</h4>
              <ol className="mt-2 text-sm text-muted-foreground list-decimal list-inside space-y-2">
                <li>**Functionality:** Drastically reduces the friction of online research.</li>
                <li>**Purpose:** A meaningful improvement to a common, often chaotic, workflow.</li>
                <li>**Technological Execution:** A clear and effective use of Chrome's built-in AI.</li>
              </ol>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-card border-t border-border/50 mt-12">
        <div className="container mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">© {new Date().getFullYear()} Tabwise — Built for the Google Chrome Built-in AI Challenge 2025</div>
          <div className="flex items-center gap-4">
            <a href="#" className="text-sm hover:text-primary">Privacy</a>
            <a href="#" className="text-sm hover:text-primary">Terms</a>
            <a href="https://devpost.com" className="text-sm hover:text-primary">Devpost</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
