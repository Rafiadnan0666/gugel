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
  FiLock,
  FiCode,
  FiCheck,
  FiMail,
  FiTwitter,
  FiLinkedin
} from 'react-icons/fi';
import { IoMdRocket } from 'react-icons/io';

interface FeatureCardProps {
  feature: {
    icon: React.ElementType;
    title: string;
    description: string;
    color: string;
  };
  index: number;
  activeFeature: number;
  setActiveFeature: (index: number) => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature, index, activeFeature, setActiveFeature }) => (
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

export default function TabwiseSuitLanding() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const features = [
    {
      icon: FiUsers,
      title: "Collaborative Research Sessions",
      description: "Create shared research sessions with your team, keeping all your resources in one place.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: FiZap,
      title: "AI-Powered Insights",
      description: "Automatically summarize articles, get key insights, and generate citations with built-in AI.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: FiEdit,
      title: "Collaborative Drafting",
      description: "Write, edit, and comment on research drafts with your team in real-time.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: FiUsers,
      title: "Team Management",
      description: "Organize your team, manage members, and control access to research sessions.",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: FiDownload,
      title: "Export Your Work",
      description: "Export your research sessions and drafts to various formats for easy sharing and archiving.",
      color: "from-indigo-500 to-blue-500"
    },
    {
      icon: FiLock,
      title: "Privacy First",
      description: "Your data is your own. We are committed to protecting your privacy.",
      color: "from-gray-600 to-gray-700"
    }
  ];

  const techStack = [
    { name: "Next.js", description: "React framework for production" },
    { name: "Tailwind CSS", description: "Utility-first CSS framework" },
    { name: "Supabase", description: "Open source Firebase alternative" },
    { name: "Gemini", description: "AI by Google" },
    { name: "Chrome Extension", description: "Browser integration" },
    { name: "TypeScript", description: "Type-safe JavaScript" }
  ];

  const steps = [
    {
      step: "1",
      title: "Create a Session",
      description: "Start a new research session for your project.",
      icon: FiChrome
    },
    {
      step: "2",
      title: "Invite Your Team",
      description: "Invite collaborators to join your session.",
      icon: FiUsers
    },
    {
      step: "3",
      title: "Gather Resources",
      description: "Add articles, notes, and other resources to your session.",
      icon: FiSearch
    },
    {
      step: "4",
      title: "Collaborate & Draft",
      description: "Work together on drafts and get AI-powered insights.",
      icon: FiEdit
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <IoMdRocket className="text-white text-xl" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Tabwise Suit
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
                href="/sign-up"
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
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6">
            Collaborative Research, 
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Made Simple.
            </span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Tabwise Suit is a collaborative research platform that helps you and your team organize, analyze, and write about your findings, all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <a 
              href="/sign-up"
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-xl transition-all flex items-center gap-2"
            >
              Sign Up for Free
            </a>
            <a 
              href="#features"
              className="px-8 py-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold hover:border-blue-500 transition-all flex items-center gap-2"
            >
              Learn More
            </a>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 max-w-4xl mx-auto">
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
                <span>AI Powered</span>
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
              A Better Way to Research
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Tabwise Suit provides the tools you need to streamline your research workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} activeFeature={activeFeature} setActiveFeature={setActiveFeature} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              How Tabwise Suit Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              A simple process to supercharge your research.
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
            Start your collaborative research journey with Tabwise Suit today.
          </p>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8">
            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div>
                <h3 className="text-lg font-semibold mb-4">Web App</h3>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-green-300" />
                    <code>git clone https://github.com/Rafiadnan0666/gugel.git</code>
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
                    Enable &quot;Developer mode&quot;
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
              href="https://github.com/Rafiadnan0666/gugel"
              className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <FiGithub />
              View on GitHub
            </a>
            <a 
              href="https://github.com/Rafiadnan0666/gugel#readme"
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
              About Tabwise Suit
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Tabwise Suit is an open-source collaborative research platform.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
            <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Tabwise Suit was created to streamline the research process for teams. We believe that by providing a unified platform for collaboration, we can help researchers save time and produce better results.
            </p>
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
                  <IoMdRocket className="text-white" />
                </div>
                <span className="text-xl font-bold">Tabwise Suit</span>
              </div>
              <p className="text-gray-400 text-sm">
                Collaborative Research, Made Simple.
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
                <li><a href="https://github.com/Rafiadnan0666/gugel" className="hover:text-white transition-colors">GitHub Repository</a></li>
                <li><a href="https://github.com/Rafiadnan0666/gugel#readme" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <div className="flex gap-4">
                <a href="https://github.com/Rafiadnan0666/gugel" className="text-gray-400 hover:text-white transition-colors">
                  <FiGithub size={20} />
                </a>
                <a href="https://github.com/Rafiadnan0666/gugel" className="text-gray-400 hover:text-white transition-.colors">
                  <FiTwitter size={20} />
                </a>
                <a href="https://github.com/Rafiadnan0666/gugel" className="text-gray-400 hover:text-white transition-colors">
                  <FiLinkedin size={20} />
                </a>
                <a href="https/github.com/Rafiadnan0666/gugel" className="text-gray-400 hover:text-white transition-colors">
                  <FiMail size={20} />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
            <p>© 2025 Tabwise Suit. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}