'use client';

import React, { useState, useEffect } from 'react';
import { 
  FiSearch, 
  FiZap, 
  FiEdit, 
  FiUsers, 
  FiDownload, 
  FiMoon, 
  FiSun,
  FiChrome,
  FiGithub,
  FiStar,
  FiEye,
  FiLock,
  FiCoffee,
  FiCode,
  FiCheck,
  FiArrowRight,
  FiExternalLink,
  FiMail,
  FiTwitter,
  FiLinkedin
} from 'react-icons/fi';

export default function TabwiseLanding() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const features = [
    {
      icon: FiSearch,
      title: "Collect Tabs",
      description: "Capture your open browser tabs, including URL, title, and content, and save them into organized research sessions.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: FiZap,
      title: "AI-Powered Summaries",
      description: "Use on-device AI (Gemini Nano) to automatically summarize articles, extract key points, and generate citations.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: FiEdit,
      title: "Rich Text Editor",
      description: "Organize findings, write drafts, and format research with a full-featured rich text editor.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: FiUsers,
      title: "Team Collaboration",
      description: "Work with your team in real-time, share research sessions, and collaborate on drafts.",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: FiDownload,
      title: "Export to PDF",
      description: "Export research sessions and drafts to PDF for easy sharing and archiving.",
      color: "from-indigo-500 to-blue-500"
    },
    {
      icon: FiLock,
      title: "Privacy First",
      description: "All AI processing happens on-device with Gemini Nano. Your data never leaves your browser.",
      color: "from-gray-600 to-gray-700"
    }
  ];

  const techStack = [
    { name: "Next.js", description: "React framework for production" },
    { name: "Tailwind CSS", description: "Utility-first CSS framework" },
    { name: "Supabase", description: "Open source Firebase alternative" },
    { name: "Gemini Nano", description: "On-device AI by Google" },
    { name: "Chrome Extension", description: "Browser integration" },
    { name: "TypeScript", description: "Type-safe JavaScript" }
  ];

  const steps = [
    {
      step: "1",
      title: "Install Extension",
      description: "Add Tabwise to Chrome in one click",
      icon: FiChrome
    },
    {
      step: "2",
      title: "Collect Tabs",
      description: "Capture all your open research tabs",
      icon: FiSearch
    },
    {
      step: "3",
      title: "AI Processing",
      description: "Get instant summaries with Gemini Nano",
      icon: FiZap
    },
    {
      step: "4",
      title: "Export & Share",
      description: "Create polished research documents",
      icon: FiDownload
    }
  ];

  const FeatureCard = ({ feature, index }) => (
    <div 
      className={`p-6 rounded-xl border transition-all duration-300 hover:scale-105 cursor-pointer ${
        activeFeature === index 
          ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 shadow-lg' 
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md'
      }`}
      onMouseEnter={() => setActiveFeature(index)}
    >
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4`}>
        <feature.icon className="text-white text-xl" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {feature.title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
        {feature.description}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Tabwise
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              {['Features', 'Tech', 'Install', 'About'].map((item) => (
                <a 
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors font-medium"
                >
                  {item}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:scale-110 transition-transform"
              >
                {darkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
              </button>
              
              <a 
                href="https://github.com/Rafiadnan0666/tabwise"
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:shadow-lg transition-all"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium mb-6">
            <FiStar className="text-yellow-500" />
            Built for Google Chrome AI Challenge 2025
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6">
            Turn Chaotic Tabs into
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Organized Research
            </span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Tabwise is a research assistant that helps you transform messy browser tabs into polished research sessions 
            using client-side AI. Built with Gemini Nano for complete privacy and offline capability.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <a 
              href="https://github.com/Rafiadnan0666/tabwise"
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-xl transition-all flex items-center gap-2"
            >
              <FiGithub />
              Star on GitHub
            </a>
            <a 
              href="#install"
              className="px-8 py-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold hover:border-blue-500 transition-all flex items-center gap-2"
            >
              <FiChrome />
              Install Extension
            </a>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 max-w-4xl mx-auto">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">Created by Rafi Adnan</div>
            <div className="flex items-center justify-center gap-6 text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <FiCode className="text-blue-500" />
                <span>Open Source</span>
              </div>
              <div className="flex items-center gap-2">
                <FiLock className="text-green-500" />
                <span>Privacy First</span>
              </div>
              <div className="flex items-center gap-2">
                <FiZap className="text-yellow-500" />
                <span>On-Device AI</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-white dark:bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Research Features
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Everything you need to transform your browsing sessions into organized research
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              How Tabwise Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Simple steps from chaotic tabs to polished research
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step) => (
              <div key={step.step} className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold group-hover:scale-110 transition-transform">
                  {step.step}
                </div>
                <step.icon className="text-3xl text-blue-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section id="tech" className="py-20 px-6 bg-white dark:bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Modern Tech Stack
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Built with cutting-edge technologies for the best performance
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {techStack.map((tech) => (
              <div key={tech.name} className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {tech.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {tech.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Installation */}
      <section id="install" className="py-20 px-6 bg-gradient-to-br from-blue-500 to-purple-500 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Get Started in Minutes
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Start organizing your research with Tabwise today
          </p>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8">
            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div>
                <h3 className="text-lg font-semibold mb-4">Web App</h3>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-green-300" />
                    <code>git clone https://github.com/Rafiadnan0666/tabwise.git</code>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-green-300" />
                    <code>npm install</code>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-green-300" />
                    <code>npm run dev</code>
                  </li>
                </ol>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Chrome Extension</h3>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-green-300" />
                    Navigate to <code>chrome://extensions</code>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-green-300" />
                    Enable "Developer mode"
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-green-300" />
                    Load the extension directory
                  </li>
                </ol>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="https://github.com/Rafiadnan0666/tabwise"
              className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <FiGithub />
              View on GitHub
            </a>
            <a 
              href="https://github.com/Rafiadnan0666/tabwise#readme"
              className="px-6 py-3 bg-transparent border border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-all"
            >
              Read Documentation
            </a>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-6 bg-white dark:bg-gray-900">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              About the Project
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Built with passion for the Google Chrome Built-in AI Challenge 2025
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                RA
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Rafi Adnan</h3>
                <p className="text-gray-600 dark:text-gray-300">Full-stack Developer & Creator</p>
              </div>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Tabwise was created to solve the problem of research tab overload. As a developer who frequently 
              works on multiple projects and research topics, I found myself drowning in browser tabs. This 
              project leverages Chrome's built-in AI capabilities to provide a privacy-focused solution that 
              works entirely on-device.
            </p>

            <div className="flex gap-4">
              <a href="https://github.com/Rafiadnan0666" className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors">
                <FiGithub />
                GitHub
              </a>
              <a href="https://rafiadnan.my.id" className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors">
                <FiExternalLink />
                Portfolio
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">T</span>
                </div>
                <span className="text-xl font-bold">Tabwise</span>
              </div>
              <p className="text-gray-400 text-sm">
                Turn chaotic browser tabs into organized research sessions with AI-powered summarization.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Project</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#tech" className="hover:text-white transition-colors">Tech Stack</a></li>
                <li><a href="#install" className="hover:text-white transition-colors">Installation</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">About</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="https://github.com/Rafiadnan0666/tabwise" className="hover:text-white transition-colors">GitHub Repository</a></li>
                <li><a href="https://github.com/Rafiadnan0666/tabwise#readme" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="https://developer.chrome.com/docs/ai" className="hover:text-white transition-colors">Chrome AI Docs</a></li>
                <li><a href="https://devpost.com" className="hover:text-white transition-colors">Devpost</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <div className="flex gap-4">
                <a href="https://github.com/Rafiadnan0666" className="text-gray-400 hover:text-white transition-colors">
                  <FiGithub size={20} />
                </a>
                <a href="https://twitter.com" className="text-gray-400 hover:text-white transition-colors">
                  <FiTwitter size={20} />
                </a>
                <a href="https://linkedin.com" className="text-gray-400 hover:text-white transition-colors">
                  <FiLinkedin size={20} />
                </a>
                <a href="mailto:rafi@example.com" className="text-gray-400 hover:text-white transition-colors">
                  <FiMail size={20} />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
            <p>© 2025 Tabwise. Created by Rafi Adnan for Google Chrome Built-in AI Challenge 2025. MIT Licensed.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}