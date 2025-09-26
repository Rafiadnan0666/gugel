'use client';

import React from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { FiArrowRight, FiExternalLink, FiGithub, FiCheckCircle, FiCalendar } from 'react-icons/fi';

export default function LandingPageTabwise() {
  return (
    <div className="min-h-screen font-sans antialiased bg-slate-50 text-slate-900 dark:bg-gray-900 dark:text-slate-50">
      <Head>
        <title>Tabwise — Research, Summarize, and Ship (Devpost)</title>
        <meta name="description" content="Tabwise — Collect open tabs, summarize research, and produce ready-to-submit Devpost demos using client-side AI (Gemini Nano / Chrome Built-in AI)." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center text-white font-bold">T</div>
            <div>
              <div className="text-lg font-extrabold">Tabwise</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Research workflow for humans (and impatient devs)</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-4">
            <a href="#what" className="text-sm hover:text-slate-800 dark:hover:text-slate-200">What</a>
            <a href="#how" className="text-sm hover:text-slate-800 dark:hover:text-slate-200">How it works</a>
            <a href="#devpost" className="text-sm hover:text-slate-800 dark:hover:text-slate-200">Devpost</a>
            <a href="#team" className="text-sm hover:text-slate-800 dark:hover:text-slate-200">Team</a>
            <a href="/dashboard" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"> Live Demo</a>
          </nav>
          <div className="md:hidden text-sm text-slate-600 dark:text-slate-400">Menu</div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Tabwise — Turn messy tabs into crisp research & a Devpost-ready demo</h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">Collect open browser tabs, auto-summarize content using client-side AI (Gemini Nano / Chrome Built-in AI), organize findings into sessions, and export a polished submission for the Google Chrome Built-in AI Challenge 2025.</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#devpost" className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-full font-semibold hover:bg-blue-700"><span>Submit to Devpost</span><FiArrowRight /></a>
              <a href="/dashboard" className="inline-flex items-center gap-2 border border-slate-200 dark:border-gray-700 px-4 py-3 rounded-full hover:bg-slate-100 dark:hover:bg-gray-800">View Demo <FiExternalLink /></a>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <div className="text-sm text-slate-500 dark:text-slate-400">Deadline</div>
                <div className="mt-1 flex items-center gap-2 font-semibold"><FiCalendar /> Nov 1, 2025 @ 13:45 GMT+7</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <div className="text-sm text-slate-500 dark:text-slate-400">Prize pool</div>
                <div className="mt-1 font-semibold">$70,000</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="w-full h-72 bg-gradient-to-br from-slate-100 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-lg p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase text-slate-500 dark:text-slate-400">Tabwise — session</div>
                  <div className="mt-2 font-semibold text-lg">Session: Chrome Built-in AI Research</div>
                </div>
                <div className="text-xs text-slate-400">5663 participants</div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3">
                <div className="bg-white dark:bg-gray-700 p-3 rounded-md border dark:border-gray-600 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-sm bg-slate-200 dark:bg-gray-600" />
                  <div className="flex-1">
                    <div className="font-medium">How the Summarizer API works</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Auto-extract the TL;DR and key points from long docs.</div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 p-3 rounded-md border dark:border-gray-600 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-sm bg-slate-200 dark:bg-gray-600" />
                  <div className="flex-1">
                    <div className="font-medium">Prompt templates for Devpost writeups</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">One-click generate the Description, What-to-Build, and Video script.</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 left-8 bg-white dark:bg-gray-800 border dark:border-gray-700 p-3 rounded-lg shadow-md text-sm">Export: <span className="font-semibold">GitHub repo + Demo link + Video script</span></div>
          </div>
        </section>

        <section id="what" className="mt-12 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold">What is Tabwise?</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Simple: when research looks like chaos (10+ tabs, half-broken links, and 3 notes files), Tabwise collects the important parts for you — client-side, private, and fast. Built to satisfy the Devpost rules: everything runs in the browser; the AI work happens locally via Chrome built-in AI when available.</p>

          <div className="mt-6 grid md:grid-cols-3 gap-4">
            <div className="p-4 border dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-3"><FiCheckCircle className="text-green-500" /><div className="font-semibold">Collect</div></div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Capture open tabs (URL, title, text snippets) and save them to sessions.</p>
            </div>
            <div className="p-4 border dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-3"><FiCheckCircle className="text-green-500" /><div className="font-semibold">Summarize</div></div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Use Summarizer + Prompt APIs to produce TL;DRs, key bullets, and citations.</p>
            </div>
            <div className="p-4 border dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-3"><FiCheckCircle className="text-green-500" /><div className="font-semibold">Export</div></div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Generate submission-ready assets: GitHub repo scaffold, README (Devpost description), and a 3-minute video script.</p>
            </div>
          </div>
        </section>

        <section id="how" className="mt-10">
          <h2 className="text-2xl font-bold">How it works (short & not boring)</h2>
          <ol className="mt-4 space-y-3 list-decimal list-inside text-slate-600 dark:text-slate-300">
            <li>Install the Chrome extension or open the web app and click <strong>Collect Tabs</strong>.</li>
            <li>Choose a session — Tabwise snapshots the visible text and metadata from each tab (client-only).</li>
            <li>Run <strong>Summarize</strong> to extract TL;DR, bullets, and suggested citations using Summarizer + Prompt templates.</li>
            <li>Use <strong>Generate Devpost</strong> to build a full submission package: description, video script, GitHub scaffold, and demo link.</li>
            <li>Export to GitHub, record a under-3-minute demo video, and submit to Devpost.</li>
          </ol>

          <div className="mt-6 bg-slate-100 dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
            <div className="font-semibold">APIs & features we demo</div>
            <ul className="mt-2 text-sm text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
              <li>Prompt API — dynamic prompts & multimodal inputs</li>
              <li>Summarizer API — long-form distillation</li>
              <li>Proofreader & Rewriter — polish the Devpost description</li>
              <li>Translator (optional) — produce English submission from other languages</li>
            </ul>
          </div>
        </section>

        <section id="devpost" className="mt-10 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm">
          <h2 className="text-2xl font-bold">Devpost submission checklist</h2>
          <div className="mt-4 grid md:grid-cols-2 gap-6">
            <div>
              <ul className="space-y-3 text-slate-600 dark:text-slate-300">
                <li>✅ New and original project (no reusing 2024 entries)</li>
                <li>✅ Demo video <strong>under 3 minutes</strong> with visible on-device usage</li>
                <li>✅ Public GitHub repo with open-source license + instructions</li>
                <li>✅ English text & video parts</li>
                <li>✅ Working demo link / deployment (if private, include test creds)</li>
              </ul>
            </div>
            <div>
              <div className="bg-slate-100 dark:bg-gray-700 p-4 rounded">
                <div className="text-sm text-slate-500 dark:text-slate-400">Judging highlights</div>
                <ol className="mt-2 text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside space-y-1">
                  <li>Functionality — does Tabwise actually reduce friction?</li>
                  <li>Purpose — meaningful improvement to common research flow</li>
                  <li>Technological execution — how well the Chrome built-in AI is used</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col md:flex-row gap-3">
            <a href="#" className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"><FiGithub /> GitHub template</a>
            <a href="#" className="inline-flex items-center gap-2 border dark:border-gray-700 px-4 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-gray-800">Devpost submission page</a>
          </div>
        </section>

        <section id="team" className="mt-10">
          <h2 className="text-2xl font-bold">Team & Contact</h2>
          <div className="mt-4 grid md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <div className="font-semibold">Rafi Adnan</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Full-stack dev, product & demo lead</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <div className="font-semibold">Co-founder</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Marketing & design</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <div className="font-semibold">Contributor</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Extension & testing</div>
            </div>
          </div>

          <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">Questions, collab, or want me to write the Devpost text for you? Ping: <a href="mailto:fn234561@gmail.com" className="underline">fn234561@gmail.com</a></div>
        </section>

        <section id="demo" className="mt-10 text-center">
          <h2 className="text-2xl font-bold">Prototype & Links</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Early preview: collect tabs, summarize, export README & script. (This is a hackathon-oriented MVP — minimal, focused, and honest.)</p>

          <div className="mt-6 flex justify-center gap-3">
            <a className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-md" href="/dashboard">Try the web app</a>
            <a className="inline-flex items-center gap-2 border dark:border-gray-700 px-5 py-3 rounded-md" href="#">Install extension (beta)</a>
          </div>
        </section>

      </main>

      <footer className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 mt-12">
        <div className="container mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-slate-600 dark:text-slate-400">© {new Date().getFullYear()} Tabwise — Built for the Google Chrome Built-in AI Challenge 2025</div>
          <div className="flex items-center gap-4">
            <a href="#" className="text-sm hover:underline">Privacy</a>
            <a href="#" className="text-sm hover:underline">Terms</a>
            <a href="https://devpost.com" className="text-sm hover:underline">Devpost</a>
          </div>
        </div>
      </footer>
    </div>
  );
}