'use client';

import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { 
  FiArrowRight, 
  FiExternalLink, 
  FiGithub, 
  FiCheckCircle, 
  FiCalendar, 
  FiZap,
  FiSearch,
  FiUsers,
  FiEdit,
  FiDownload,
  FiMoon,
  FiSun,
  FiMenu,
  FiX,
  FiPlay,
  FiPause,
  FiStar,
  FiHeart,
  FiShare2,
  FiLock,
  FiCloud,
  FiCpu,
  FiGlobe,
  FiAward,
  FiTrendingUp,
  FiShield,
  FiRocket
} from 'react-icons/fi';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValueEvent, useInView } from 'framer-motion';

export default function LandingPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const featuresRef = useRef(null);
  const heroRef = useRef(null);
  const testimonialsRef = useRef(null);
  const { scrollYProgress } = useScroll();

  // Modern running text tapes
  const runningTexts = [
    "NEURAL AI PROCESSING • QUANTUM SUMMARIZATION • REAL-TIME COLLABORATION • MILITARY-GRADE PRIVACY •",
    "10X RESEARCH SPEED • ON-DEVICE PROCESSING • MULTI-FORMAT EXPORT • INTELLIGENT TAGGING • SMART ORGANIZATION •",
    "AUTOMATIC CITATIONS • CONTEXT-AWARE ANALYSIS • TEAM WORKSPACES • VERSION CONTROL • CLOUD SYNC •"
  ];

  // Enhanced testimonials
  const testimonials = [
    {
      name: "Dr. Sarah Chen",
      role: "Lead Researcher at NeuroTech",
      content: "Tabwise revolutionized how our team conducts research. The AI summarization saves us 20+ hours weekly.",
      avatar: "SC",
      rating: 5
    },
    {
      name: "Marcus Rodriguez",
      role: "PhD Candidate, Stanford",
      content: "The privacy-focused approach convinced our ethics board. Finally, AI tools that respect academic integrity.",
      avatar: "MR",
      rating: 5
    },
    {
      name: "Alexandra Petrov",
      role: "Tech Journalist",
      content: "I've tested every research tool available. Tabwise's neural architecture is genuinely next-generation.",
      avatar: "AP",
      rating: 5
    }
  ];

  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }

    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setScrollProgress(latest * 100);
  });

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: FiSearch,
      title: "Neural Collection Engine",
      description: "Advanced AI captures and structures your research automatically. Intelligent tagging and context-aware organization.",
      color: "from-cyan-400 to-blue-500",
      bgColor: "bg-gradient-to-br from-cyan-400/20 to-blue-500/20",
      gradient: "linear-gradient(135deg, #22d3ee, #3b82f6)",
      delay: 0.1
    },
    {
      icon: FiZap,
      title: "Quantum Summarization",
      description: "Multi-model AI that understands context, extracts insights, and generates publication-ready summaries in seconds.",
      color: "from-violet-500 to-purple-600",
      bgColor: "bg-gradient-to-br from-violet-500/20 to-purple-600/20",
      gradient: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
      delay: 0.2
    },
    {
      icon: FiEdit,
      title: "Holographic Editor",
      description: "3D workspace with spatial organization. Drag, connect, and visualize research relationships intuitively.",
      color: "from-emerald-400 to-green-500",
      bgColor: "bg-gradient-to-br from-emerald-400/20 to-green-500/20",
      gradient: "linear-gradient(135deg, #34d399, #10b981)",
      delay: 0.3
    },
    {
      icon: FiUsers,
      title: "Sync Collaboration",
      description: "Real-time multi-user editing with presence indicators, version control, and intelligent merge resolution.",
      color: "from-orange-400 to-red-500",
      bgColor: "bg-gradient-to-br from-orange-400/20 to-red-500/20",
      gradient: "linear-gradient(135deg, #fb923c, #ef4444)",
      delay: 0.4
    },
    {
      icon: FiDownload,
      title: "Multi-Dimensional Export",
      description: "Export to any format with smart formatting. PDF, Markdown, HTML, and interactive presentations.",
      color: "from-indigo-400 to-blue-500",
      bgColor: "bg-gradient-to-br from-indigo-400/20 to-blue-500/20",
      gradient: "linear-gradient(135deg, #818cf8, #3b82f6)",
      delay: 0.5
    }
  ];

  const stats = [
    { number: "10x", label: "Research Speed", suffix: "faster", icon: FiTrendingUp },
    { number: "99%", label: "Time Saved", suffix: "automated", icon: FiZap },
    { number: "100%", label: "Privacy", suffix: "on-device", icon: FiLock },
    { number: "24/7", label: "AI Assistant", suffix: "available", icon: FiCpu }
  ];

  const pricingPlans = [
    {
      name: "Researcher",
      price: "$29",
      period: "/month",
      description: "Perfect for individual researchers and students",
      features: ["Up to 1000 summaries/month", "Basic AI models", "PDF export", "1 workspace"],
      popular: false,
      gradient: "from-gray-600 to-gray-700"
    },
    {
      name: "Team",
      price: "$79",
      period: "/month",
      description: "Ideal for research teams and labs",
      features: ["Unlimited summaries", "Advanced AI models", "All export formats", "5 workspaces", "Real-time collaboration"],
      popular: true,
      gradient: "from-cyan-500 to-blue-600"
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large organizations and institutions",
      features: ["Everything in Team", "Custom AI training", "Dedicated support", "Unlimited workspaces", "SLA guarantee"],
      popular: false,
      gradient: "from-purple-500 to-pink-600"
    }
  ];

  // Particle background component
  const Particles = () => (
    <div className="absolute inset-0 overflow-hidden">
      {[...Array(100)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-gradient-to-r from-cyan-400/40 to-blue-500/40 rounded-full"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
          }}
          animate={{
            y: [0, -200, 0],
            x: [0, Math.random() * 200 - 100, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: Math.random() * 4 + 3,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}
    </div>
  );

  // Advanced running text tape component
  const RunningTextTape = ({ texts, speed = 50, reverse = false, className = "" }) => {
    const [currentText, setCurrentText] = useState(0);
    
    useEffect(() => {
      if (!isPlaying) return;
      
      const interval = setInterval(() => {
        setCurrentText((prev) => (prev + 1) % texts.length);
      }, 4000);
      
      return () => clearInterval(interval);
    }, [texts.length, isPlaying]);

    return (
      <div className={`relative overflow-hidden bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 py-4 border-y border-gray-700/50 ${className}`}>
        <motion.div
          className="flex whitespace-nowrap"
          animate={{
            x: reverse ? [0, -1000] : [1000, 0],
          }}
          transition={{
            duration: speed,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {[...Array(6)].map((_, repetition) => (
            <div key={repetition} className="flex items-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentText}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-lg font-semibold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mx-8"
                >
                  {texts[currentText]}
                </motion.span>
              </AnimatePresence>
              <motion.div 
                className="w-2 h-2 bg-cyan-400 rounded-full mx-4"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </div>
          ))}
        </motion.div>
        
        {/* Enhanced glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 via-purple-400/5 to-blue-400/5"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>
    );
  };

  // Custom cursor effect
  const CustomCursor = () => (
    <motion.div
      className="fixed pointer-events-none z-50 mix-blend-difference"
      animate={{
        x: mousePosition.x - 20,
        y: mousePosition.y - 20,
      }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
    >
      <div className="w-10 h-10 rounded-full bg-cyan-400/20 border border-cyan-400/50 backdrop-blur-sm" />
    </motion.div>
  );

  // Enhanced feature card component
  const FeatureCard = ({ feature, index, isActive }) => (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: index * 0.2 }}
      whileHover={{ 
        scale: 1.02,
        y: -10,
        transition: { type: "spring", stiffness: 300 }
      }}
      className={`p-8 rounded-3xl cursor-pointer relative overflow-hidden group ${
        isActive 
          ? 'shadow-2xl shadow-cyan-400/30 border-2 border-cyan-400/50' 
          : 'bg-gray-900/30 backdrop-blur-lg border border-gray-700/30'
      }`}
      onMouseEnter={() => setActiveFeature(index)}
    >
      {/* Animated background gradient */}
      <motion.div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100"
        style={{ background: feature.gradient }}
        transition={{ duration: 0.5 }}
      />
      
      {/* Floating particles */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute w-2 h-2 rounded-full bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-100`}
          style={{
            left: `${20 + i * 30}%`,
            top: '10%',
          }}
          animate={{
            y: [0, -20, 0],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 2 + i,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        />
      ))}
      
      <div className="relative z-10 flex items-start gap-6">
        <motion.div 
          className={`p-4 rounded-2xl bg-gradient-to-r ${feature.color} shadow-lg group-hover:shadow-2xl group-hover:shadow-cyan-400/30`}
          whileHover={{ rotate: 360, scale: 1.1 }}
          transition={{ duration: 0.5 }}
        >
          <feature.icon className="text-white text-2xl" />
        </motion.div>
        <div>
          <h3 className="text-2xl font-bold mb-3 text-white">
            {feature.title}
          </h3>
          <p className="text-gray-300 leading-relaxed">
            {feature.description}
          </p>
        </div>
      </div>
      
      {/* Hover effect line */}
      <motion.div 
        className="absolute bottom-0 left-0 w-0 h-1 bg-cyan-400 group-hover:w-full"
        transition={{ duration: 0.5 }}
      />
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-purple-950 text-white overflow-hidden">
      <Head>
        <title>Tabwise — Quantum Research Intelligence Platform</title>
        <meta name="description" content="Next-generation AI research platform with neural architecture, quantum summarization, and military-grade privacy." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Custom Cursor */}
      <CustomCursor />

      {/* Animated Background */}
      <div className="fixed inset-0">
        <Particles />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950/90 via-blue-950/70 to-purple-950/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-400/15 via-transparent to-transparent" />
        
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.3)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
        </div>
      </div>

      {/* Scroll Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-cyan-400 to-blue-500 z-50 shadow-2xl shadow-cyan-400/30"
        style={{ width: `${scrollProgress}%` }}
        initial={{ width: 0 }}
      />

      {/* Navigation */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-700/50"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <motion.div 
                className="w-12 h-12 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center shadow-2xl shadow-cyan-400/20 relative overflow-hidden"
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.5 }}
              >
                <span className="text-white font-bold text-xl relative z-10">T</span>
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-500/20"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              <motion.span 
                className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent"
                whileHover={{ scale: 1.1 }}
              >
                Tabwise
              </motion.span>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {['Features', 'Demo', 'Pricing', 'Enterprise', 'Docs'].map((item) => (
                <motion.a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  whileHover={{ y: -2, color: "#22d3ee" }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className="text-gray-300 hover:text-cyan-400 transition-all font-medium relative group"
                >
                  {item}
                  <motion.div 
                    className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyan-400 group-hover:w-full"
                    transition={{ duration: 0.3 }}
                  />
                </motion.a>
              ))}
              
              <div className="flex items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 180 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-3 rounded-2xl bg-gray-800/50 text-cyan-400 border border-cyan-400/20 hover:border-cyan-400/40"
                >
                  {darkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05, backgroundColor: "rgba(34, 211, 238, 0.1)" }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 text-cyan-400 font-medium border border-cyan-400/30 rounded-2xl backdrop-blur-lg hover:border-cyan-400/50"
                >
                  Sign In
                </motion.button>
                
                <motion.button
                  whileHover={{ 
                    scale: 1.05, 
                    boxShadow: "0 0 40px rgba(34, 211, 238, 0.4)" 
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-gray-900 rounded-2xl font-semibold shadow-2xl shadow-cyan-400/30 hover:shadow-cyan-400/50"
                >
                  Launch App
                </motion.button>
              </div>
            </nav>

            {/* Mobile Menu Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-3 rounded-2xl bg-gray-800/50 text-cyan-400 border border-cyan-400/20"
            >
              {mobileMenuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-gray-900/95 backdrop-blur-xl border-t border-gray-700/50"
            >
              <div className="container mx-auto px-6 py-6 flex flex-col gap-6">
                {['Features', 'Demo', 'Pricing', 'Enterprise', 'Docs'].map((item) => (
                  <motion.a
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    whileHover={{ x: 10 }}
                    className="text-gray-300 hover:text-cyan-400 py-3 border-b border-gray-700/50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item}
                  </motion.a>
                ))}
                <div className="flex gap-4 pt-4">
                  <button className="flex-1 py-4 text-cyan-400 border border-cyan-400/30 rounded-2xl">
                    Sign In
                  </button>
                  <button className="flex-1 py-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-gray-900 rounded-2xl font-semibold">
                    Launch
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Running Text Tapes */}
      <RunningTextTape texts={runningTexts} speed={30} />
      
      {/* Play/Pause Control */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1 }}
        onClick={() => setIsPlaying(!isPlaying)}
        className="fixed left-6 top-1/2 z-40 p-3 bg-gray-900/50 backdrop-blur-lg rounded-2xl border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10"
        whileHover={{ scale: 1.1 }}
      >
        {isPlaying ? <FiPause size={20} /> : <FiPlay size={20} />}
      </motion.button>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-40 pb-32 px-6 overflow-hidden">
        <div className="container mx-auto max-w-7xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-center"
          >
            {/* Animated Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-400/10 border border-cyan-400/30 rounded-full mb-8 backdrop-blur-lg"
            >
              <motion.div 
                className="w-2 h-2 bg-cyan-400 rounded-full"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-cyan-400 font-semibold">NEURAL RESEARCH PLATFORM v2.0 LAUNCHED</span>
            </motion.div>

            <motion.h1 
              className="text-6xl md:text-8xl font-black mb-8 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Quantum
              </span>
              <br />
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                Research
              </motion.span>{' '}
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-gray-300"
              >
                Intelligence
              </motion.span>
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              Transform chaotic browser tabs into structured intelligence with our neural AI platform. 
              <span className="text-cyan-400"> Quantum-powered summarization</span> meets military-grade privacy.
            </motion.p>

            {/* Animated CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              <motion.button
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 0 50px rgba(34, 211, 238, 0.6)"
                }}
                whileTap={{ scale: 0.95 }}
                className="px-12 py-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-gray-900 rounded-2xl font-bold text-lg shadow-2xl shadow-cyan-400/30 flex items-center gap-3 group relative overflow-hidden"
              >
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-500/20"
                  animate={{ x: [-100, 100] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="relative z-10">Activate Neural Core</span>
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="relative z-10"
                >
                  <FiArrowRight />
                </motion.div>
              </motion.button>
              
              <motion.button
                whileHover={{ 
                  scale: 1.05,
                  backgroundColor: "rgba(34, 211, 238, 0.15)"
                }}
                whileTap={{ scale: 0.95 }}
                className="px-12 py-4 border border-cyan-400/30 text-cyan-400 rounded-2xl font-semibold text-lg backdrop-blur-lg flex items-center gap-3 hover:border-cyan-400/50"
              >
                <FiPlay className="text-cyan-400" />
                <span>Watch Quantum Demo</span>
              </motion.button>
            </motion.div>

            {/* Enhanced Stats Grid */}
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.6 + index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="text-center p-6 bg-gray-900/30 backdrop-blur-lg rounded-2xl border border-cyan-400/10 hover:border-cyan-400/30 transition-all group relative overflow-hidden"
                >
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-blue-400/5 opacity-0 group-hover:opacity-100"
                    transition={{ duration: 0.3 }}
                  />
                  <motion.div 
                    className="text-3xl md:text-4xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2 relative z-10"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, delay: index * 0.5, repeat: Infinity }}
                  >
                    {stat.number}
                  </motion.div>
                  <div className="text-sm text-gray-400 font-medium relative z-10">{stat.label}</div>
                  <div className="text-xs text-cyan-400/70 mt-1 relative z-10">{stat.suffix}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Enhanced Floating Elements */}
        <motion.div
          className="absolute top-1/4 right-10 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 left-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.6, 0.3],
            rotate: [360, 180, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, delay: 1 }}
        />
      </section>

      {/* Second Running Text Tape */}
      <RunningTextTape texts={runningTexts} speed={40} reverse={true} />

      {/* Features Section */}
      <section id="features" className="relative py-32 px-6 overflow-hidden">
        <div className="container mx-auto max-w-7xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, type: "spring" }}
              className="inline-block mb-4"
            >
              <span className="text-cyan-400 font-bold text-sm uppercase tracking-widest bg-cyan-400/10 px-4 py-2 rounded-full">
                Neural Features
              </span>
            </motion.div>
            <h2 className="text-5xl md:text-7xl font-black mb-6">
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Quantum-Powered
              </span>
              <br />
              Intelligence
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Experience the future of research with our neural network architecture
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              {features.map((feature, index) => (
                <FeatureCard 
                  key={feature.title}
                  feature={feature}
                  index={index}
                  isActive={activeFeature === index}
                />
              ))}
            </div>

            {/* 3D Feature Visualization */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateY: 180 }}
              whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, type: "spring" }}
              className="relative h-[600px]"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature}
                  initial={{ opacity: 0, rotateX: 45, scale: 0.5 }}
                  animate={{ opacity: 1, rotateX: 0, scale: 1 }}
                  exit={{ opacity: 0, rotateX: -45, scale: 0.5 }}
                  transition={{ duration: 0.8, type: "spring" }}
                  className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-purple-400/10 rounded-3xl flex items-center justify-center border border-cyan-400/20 shadow-2xl shadow-cyan-400/20"
                  style={{ 
                    transform: 'perspective(1000px) rotateY(20deg) rotateX(10deg)',
                  }}
                >
                  <div className="text-8xl">
                    {React.createElement(features[activeFeature].icon, {
                      className: `bg-gradient-to-r ${features[activeFeature].color} bg-clip-text text-transparent`
                    })}
                  </div>
                  
                  {/* Enhanced floating particles */}
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      className={`absolute w-3 h-3 rounded-full bg-gradient-to-r ${features[activeFeature].color}`}
                      style={{
                        left: `${Math.random() * 80 + 10}%`,
                        top: `${Math.random() * 80 + 10}%`,
                      }}
                      animate={{
                        y: [0, -30, 0],
                        x: [0, Math.random() * 40 - 20, 0],
                        scale: [1, 1.8, 1],
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 3 + Math.random() * 2,
                        repeat: Infinity,
                        delay: i * 0.3,
                      }}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Third Running Text Tape */}
      <RunningTextTape texts={runningTexts} speed={35} />

      {/* How It Works Section */}
      <section id="demo" className="relative py-32 px-6 bg-gradient-to-br from-gray-900/50 to-blue-900/30">
        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, type: "spring" }}
              className="inline-block mb-4"
            >
              <span className="text-cyan-400 font-bold text-sm uppercase tracking-widest bg-cyan-400/10 px-4 py-2 rounded-full">
                Process
              </span>
            </motion.div>
            <h2 className="text-5xl md:text-6xl font-black mb-6">
              How It <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Works</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Three simple steps from chaotic tabs to polished research
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Capture & Collect",
                description: "One-click tab collection with intelligent content analysis",
                icon: FiSearch,
                color: "from-cyan-400 to-blue-500"
              },
              {
                step: "02",
                title: "AI Processing",
                description: "Neural networks summarize, extract insights, and generate citations",
                icon: FiCpu,
                color: "from-purple-400 to-pink-500"
              },
              {
                step: "03",
                title: "Export & Share",
                description: "Publish, collaborate, or export to any format instantly",
                icon: FiShare2,
                color: "from-green-400 to-emerald-500"
              }
            ].map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="text-center p-8 bg-gray-900/30 backdrop-blur-lg rounded-3xl border border-gray-700/30 hover:border-cyan-400/30 transition-all group"
              >
                <motion.div 
                  className="w-20 h-20 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold group-hover:scale-110 transition-transform"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  {step.step}
                </motion.div>
                <step.icon className="text-4xl mx-auto mb-4 text-cyan-400" />
                <h3 className="text-2xl font-bold mb-4 text-white">
                  {step.title}
                </h3>
                <p className="text-gray-300">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section ref={testimonialsRef} className="relative py-32 px-6 overflow-hidden">
        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-black mb-6">
              Trusted by <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Researchers</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Join thousands of researchers who transformed their workflow
            </p>
          </motion.div>

          <div className="relative h-96">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 bg-gray-900/30 backdrop-blur-lg rounded-3xl border border-cyan-400/20 p-8 flex flex-col justify-center"
              >
                <div className="text-center max-w-2xl mx-auto">
                  <div className="flex justify-center mb-6">
                    {[...Array(5)].map((_, i) => (
                      <FiStar key={i} className="text-yellow-400 fill-current mx-1" />
                    ))}
                  </div>
                  <p className="text-2xl text-gray-200 mb-8 italic">
                    "{testimonials[activeTestimonial].content}"
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {testimonials[activeTestimonial].avatar}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-white text-lg">
                        {testimonials[activeTestimonial].name}
                      </div>
                      <div className="text-cyan-400">
                        {testimonials[activeTestimonial].role}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            
            {/* Navigation dots */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    activeTestimonial === index 
                      ? 'bg-cyan-400 scale-125' 
                      : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-32 px-6 bg-gradient-to-br from-purple-900/20 to-blue-900/20">
        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, type: "spring" }}
              className="inline-block mb-4"
            >
              <span className="text-cyan-400 font-bold text-sm uppercase tracking-widest bg-cyan-400/10 px-4 py-2 rounded-full">
                Pricing
              </span>
            </motion.div>
            <h2 className="text-5xl md:text-6xl font-black mb-6">
              Simple <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Pricing</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Choose the plan that fits your research needs
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className={`relative rounded-3xl p-8 backdrop-blur-lg border-2 ${
                  plan.popular 
                    ? 'border-cyan-400/50 bg-gradient-to-br from-cyan-400/10 to-blue-400/10' 
                    : 'border-gray-700/30 bg-gray-900/30'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-cyan-400 to-blue-500 text-gray-900 px-4 py-1 rounded-full text-sm font-bold">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    <span className="text-gray-400">{plan.period}</span>
                  </div>
                  <p className="text-gray-400">{plan.description}</p>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-300">
                      <FiCheckCircle className="text-cyan-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`w-full py-3 rounded-xl font-semibold ${
                    plan.popular
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-gray-900'
                      : 'bg-gray-800 text-white border border-gray-700'
                  }`}
                >
                  Get Started
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, type: "spring" }}
              className="inline-block mb-4"
            >
              <span className="text-cyan-400 font-bold text-sm uppercase tracking-widest bg-cyan-400/10 px-4 py-2 rounded-full">
                Ready to Start?
              </span>
            </motion.div>
            
            <h2 className="text-5xl md:text-7xl font-black mb-6">
              Start Your <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">Quantum Research</span> Journey
            </h2>
            
            <p className="text-xl mb-8 text-gray-300 max-w-2xl mx-auto">
              Join researchers from top institutions who use Tabwise to accelerate their work
            </p>
            
            <motion.div
              className="flex flex-col sm:flex-row gap-6 justify-center items-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <motion.button
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 0 50px rgba(34, 211, 238, 0.6)"
                }}
                whileTap={{ scale: 0.95 }}
                className="px-12 py-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-gray-900 rounded-2xl font-bold text-lg shadow-2xl shadow-cyan-400/30"
              >
                Start Free Trial
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "rgba(34, 211, 238, 0.1)" }}
                whileTap={{ scale: 0.95 }}
                className="px-12 py-4 border border-cyan-400/30 text-cyan-400 rounded-2xl font-semibold text-lg backdrop-blur-lg"
              >
                Book a Demo
              </motion.button>
            </motion.div>
            
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="text-gray-400 mt-6"
            >
              No credit card required • 14-day free trial • Cancel anytime
            </motion.p>
          </motion.div>
        </div>
        
        {/* Background elements */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 via-purple-400/5 to-blue-400/5"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      </section>

      {/* Footer */}
      <footer className="relative bg-gray-900/80 backdrop-blur-xl border-t border-gray-700/50 py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">T</span>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Tabwise
                </span>
              </div>
              <p className="text-gray-400 mb-6">
                Quantum research intelligence for the modern era.
              </p>
              <div className="flex gap-4">
                {[FiGithub, FiTwitter, FiLinkedin, FiGlobe].map((Icon, index) => (
                  <motion.a
                    key={index}
                    href="#"
                    whileHover={{ scale: 1.2, y: -2 }}
                    className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-cyan-400"
                  >
                    <Icon />
                  </motion.a>
                ))}
              </div>
            </div>
            
            {['Product', 'Company', 'Resources', 'Legal'].map((category) => (
              <div key={category}>
                <h4 className="font-semibold text-white mb-4">{category}</h4>
                <ul className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <li key={i}>
                      <motion.a
                        href="#"
                        whileHover={{ x: 5, color: "#22d3ee" }}
                        className="text-gray-400 hover:text-cyan-400 transition-colors"
                      >
                        Link {i + 1}
                      </motion.a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-700/50 pt-8 text-center text-gray-400">
            <p>© {new Date().getFullYear()} Tabwise. All rights reserved. Built with quantum intelligence.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Add missing social icons
const FiTwitter = ({ size = 20, className = "" }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
  </svg>
);

const FiLinkedin = ({ size = 20, className = "" }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);