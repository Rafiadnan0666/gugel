'use client';
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { FiArrowRight, FiExternalLink, FiGithub, FiMenu, FiX } from 'react-icons/fi';
import Image from 'next/image';

interface IPost {
  id: number;
  title: string;
  content: string;
  attachment: string;
  visibility: string;
  slug: string;
  user_id: string;
  team_id: number;
  type: string;
  link: string;
  created_at: Date;
  updated_at: Date;
}



export default function LandingPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [activeProject, setActiveProject] = useState<IPost | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sample work data
  const works: IPost[] = [
    {
      id: 1,
      title: "Kopper Coffee",
      content: "Minimalist landing page for a local coffee brand, focused on storytelling and conversion.",
      attachment: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      visibility: "public",
      slug: "kopper-coffee",
      user_id: "1",
      team_id: 1,
      type: "work",
      link: "https://koppercoffee.com",
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      title: "Furni Woodworks",
      content: "Single page furniture catalog site with smooth transitions and interactive filtering.",
      attachment: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      visibility: "public",
      slug: "furni-woodworks",
      user_id: "1",
      team_id: 1,
      type: "work",
      link: "https://furniwoodworks.com",
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      title: "Kaos Lokal",
      content: "High-conversion landing page for an indie T-shirt brand targeting Indonesian youth.",
      attachment: "https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      visibility: "public",
      slug: "kaos-lokal",
      user_id: "1",
      team_id: 1,
      type: "work",
      link: "https://kaoslokal.com",
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Draggable carousel functionality
  const startDrag = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX);
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  const duringDrag = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX;
    const walk = (x - startX) * 2;
    e.currentTarget.scrollLeft = scrollLeft - walk;
  };

  const endDrag = () => {
    setIsDragging(false);
  };

  // Parallax effect for background elements
  const parallaxStyle = (speed: number) => ({
    transform: `translate(${cursorPosition.x * speed}px, ${cursorPosition.y * speed}px)`
  });

  return (
    <>
      <Head>
      <title>Kacang Panjang Studio</title>
<meta name="description" content="Kacang Panjang Studio is a Tangerang-based digital studio specializing in Laravel-based backends, modern front-ends, and custom web tools." />
<meta name="keywords" content="Kacang Panjang Studio, Web Development, Digital Studio, Laravel, Frontend Development, Backend Development, Custom Web Tools" />
<meta name="author" content="Kacang Panjang Studio" />
<meta name="creator" content="Kacang Panjang Studio" />
<meta name="robots" content="index, follow" />
<meta name="googlebot" content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1" />


<meta property="og:title" content="Kacang Panjang Studio" />
<meta property="og:description" content="Kacang Panjang Studio is a Tangerang-based digital studio specializing in Laravel-based backends, modern front-ends, and custom web tools." />
<meta property="og:url" content="https://kacangpanjang.my.id" />
<meta property="og:site_name" content="Kacang Panjang Studio" />
<meta property="og:image" content="https://cdn.lynkid.my.id/profile/13-06-2025/1749821958148_1854604.webp" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Kacang Panjang Studio" />
<meta property="og:type" content="website" />
<meta property="og:locale" content="en_US" />


<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="blue-translucent" />
<meta name="apple-mobile-web-app-title" content="Kacang Panjang Studio" />


<link rel="icon" href="/favicon.ico" />

      </Head>

      <main className="bg-[#0a0a0a] text-white font-sans min-h-screen overflow-x-hidden relative">
        {/* Animated background elements with parallax */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full filter blur-3xl animate-float"
            style={parallaxStyle(0.02)}
          ></div>
          <div 
            className="absolute top-2/3 right-1/3 w-96 h-96 bg-teal-500/10 rounded-full filter blur-3xl animate-float-delay"
            style={parallaxStyle(0.03)}
          ></div>
          <div 
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-green-500/10 rounded-full filter blur-3xl animate-float"
            style={parallaxStyle(0.01)}
          ></div>
        </div>

        {/* Floating particles */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white/5"
              style={{
                width: `${Math.random() * 6 + 2}px`,
                height: `${Math.random() * 6 + 2}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animation: `float ${Math.random() * 10 + 10}s linear infinite`,
                animationDelay: `${Math.random() * 5}s`
              }}
            ></div>
          ))}
        </div>

        <header  className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-12 py-3 md:py-4 border-b border-gray-800 text-sm backdrop-blur-lg bg-transparent"
  style={{ background: "rgba(16,16,16,0.7)" }}>
          <div className="flex items-center">
            <Image 
              src="/favicon.ico" 
              alt="kacangpanjang.id logo"
              width={32}
              height={32}
              className="mr-3"
            />
            <h1 className="font-bold tracking-widest text-lg hover:text-emerald-400 transition-colors">
              <a href="/">kacangpanjang.id</a>
            </h1>
          </div>
          
          <nav className="hidden md:flex space-x-8 items-center">
            <a href="#about" className="hover:text-emerald-400 transition group">
              About
              <span className="block h-0.5 bg-emerald-400 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
            </a>
            <a href="/work" className="hover:text-emerald-400 transition group">
              Work
              <span className="block h-0.5 bg-emerald-400 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
            </a>
            <a href="#services" className="hover:text-emerald-400 transition group">
              Services
              <span className="block h-0.5 bg-emerald-400 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
            </a>
            <a href="#contact" className="hover:text-emerald-400 transition group">
              Contact
              <span className="block h-0.5 bg-emerald-400 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
            </a>
            <a 
              href="/affiliate" 
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-md hover:scale-105 transition transform flex items-center"
            >
              Join Us <FiArrowRight className="ml-2" />
            </a>
          </nav>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2 text-gray-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </header>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-[#0a0a0a] pt-20 px-6 pb-8 flex flex-col space-y-6">
            <a 
              href="#about" 
              className="text-lg hover:text-emerald-400 transition"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </a>
            <a 
              href="/work" 
              className="text-lg hover:text-emerald-400 transition"
              onClick={() => setMobileMenuOpen(false)}
            >
              Work
            </a>
            <a 
              href="#services" 
              className="text-lg hover:text-emerald-400 transition"
              onClick={() => setMobileMenuOpen(false)}
            >
              Services
            </a>
            <a 
              href="#contact" 
              className="text-lg hover:text-emerald-400 transition"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </a>
            <a 
              href="/affiliate" 
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-md hover:opacity-90 transition font-medium text-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Join Our Affiliate Program
            </a>
          </div>
        )}

        <section id="hero" className="relative z-10 px-6 py-24 md:py-40 text-center mt-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Crafting Bold <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Digital Experiences</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10">
              Based in Tangerang, we design and build high-performance websites using Laravel, Next.js, and scalable modern tech—tailored just for your brand.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-md hover:scale-105 transition transform font-medium flex items-center justify-center">
                🌟 See What Weve Built
              </button>
              <button className="px-6 py-3 border border-gray-700 rounded-md hover:bg-gray-800/50 transition font-medium flex items-center justify-center">
                Learn About Us
              </button>
            </div>
          </div>
        </section>

        <section id="about" className="relative z-10 px-6 py-16 md:py-32 bg-gradient-to-b from-[#0a0a0a] to-[#111]">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-sm uppercase tracking-widest text-emerald-400 mb-4">About Our Studio</h3>
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="space-y-6">
                <p className="text-3xl md:text-4xl font-medium leading-tight">
                  kacangpanjang.id is a Tangerang-based digital studio founded by passionate developers and designers.
                </p>
                <p className="text-gray-300">
                  Since 2025, weve been crafting digital solutions that merge clean code with compelling design — creating experiences people love to use.
                </p>
                <p className="text-gray-300">
                  Our collaborative team has contributed to a wide range of projects — from startup MVPs to enterprise platforms — serving clients across Indonesia and Southeast Asia.
                </p>
                <div className="flex flex-wrap gap-3">
                  {/* <div className="px-4 py-2 bg-[#1a1a1a] rounded-full border border-gray-800 hover:border-emerald-500 transition hover:-translate-y-1">
                    <span className="text-emerald-400 mr-2">•</span> 5+ Years Experience
                  </div>
                  <div className="px-4 py-2 bg-[#1a1a1a] rounded-full border border-gray-800 hover:border-emerald-500 transition hover:-translate-y-1">
                    <span className="text-emerald-400 mr-2">•</span> 50+ Projects
                  </div> */}
                </div>
              </div>
              <div className="bg-[#1a1a1a] p-6 md:p-8 rounded-xl border border-gray-800 shadow-lg hover:shadow-emerald-500/10 transition">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#0e0e0e] rounded-lg border border-gray-800 hover:border-emerald-500 transition hover:-translate-y-1">
                    <h4 className="font-medium mb-2">End-to-End Expertise</h4>
                    <p className="text-sm text-gray-400">From backend to frontend — weve got you covered.</p>
                  </div>
                  <div className="p-4 bg-[#0e0e0e] rounded-lg border border-gray-800 hover:border-emerald-500 transition hover:-translate-y-1">
                    <h4 className="font-medium mb-2">Client-Centered</h4>
                    <p className="text-sm text-gray-400">We work closely with clients to deliver impact-driven results.</p>
                  </div>
                  <div className="p-4 bg-[#0e0e0e] rounded-lg border border-gray-800 hover:border-emerald-500 transition hover:-translate-y-1">
                    <h4 className="font-medium mb-2">Built with Care</h4>
                    <p className="text-sm text-gray-400">We obsess over quality, usability, and performance.</p>
                  </div>
                  <div className="p-4 bg-[#0e0e0e] rounded-lg border border-gray-800 hover:border-emerald-500 transition hover:-translate-y-1">
                    <h4 className="font-medium mb-2">Modern Tech</h4>
                    <p className="text-sm text-gray-400">Using the latest frameworks and best practices.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="relative z-10 px-6 py-16 md:py-32">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-sm uppercase tracking-widest text-emerald-400 mb-4 text-center">Our Services</h3>
            <p className="text-3xl md:text-4xl font-medium mb-12 text-center max-w-3xl mx-auto">
              Comprehensive digital solutions tailored to your business needs
            </p>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: "Web Development",
                  desc: "Custom websites and web applications built with modern technologies like Laravel, Next.js, and React.",
                  icon: "💻",
                  features: ["Custom CMS", "API Integration", "Performance Optimization"]
                },
                {
                  title: "E-commerce Solutions",
                  desc: "Complete online stores with payment gateways, inventory management, and marketing tools.",
                  icon: "🛒",
                  features: ["Shopify/Laravel", "Payment Gateways", "Product Management"]
                },
                {
                  title: "Web Applications",
                  desc: "Cross-platform Web apps for iOS and Android with React Native and Flutter.",
                  icon: "📱",
                  features: ["iOS & Android", "Offline Support", "Push Notifications"]
                },
                {
                  title: "UI/UX Design",
                  desc: "Beautiful, intuitive interfaces that enhance user experience and drive engagement.",
                  icon: "🎨",
                  features: ["User Research", "Wireframing", "Prototyping"]
                },
                {
                  title: "API Development",
                  desc: "RESTful and GraphQL APIs to connect your systems and enable seamless data flow.",
                  icon: "🔌",
                  features: ["REST/GraphQL", "WebSockets", "Authentication"]
                },
                {
                  title: "DevOps & Cloud",
                  desc: "Deployment, scaling, and maintenance of your applications on AWS, GCP, or Azure.",
                  icon: "☁️",
                  features: ["CI/CD Pipelines", "Auto-scaling", "Monitoring"]
                }
              ].map((service, index) => (
                <div 
                  key={index} 
                  className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800 hover:border-emerald-500 transition-all hover:-translate-y-2 group"
                >
                  <div className="text-3xl mb-4 group-hover:text-emerald-400 transition">{service.icon}</div>
                  <h4 className="text-xl font-medium mb-3">{service.title}</h4>
                  <p className="text-gray-400 mb-4">{service.desc}</p>
                  <ul className="space-y-2 text-sm text-gray-400">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-emerald-400 mr-2">•</span> {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="work" className="relative z-10 px-6 py-16 md:py-32 bg-gradient-to-b from-[#111] to-[#0a0a0a]">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-sm uppercase tracking-widest text-emerald-400 mb-4 text-center">Our Projects</h3>
            <p className="text-3xl md:text-4xl font-medium mb-12 text-center max-w-3xl mx-auto">
              Some of our recent work that were proud of
            </p>
            
            <div 
              className="relative overflow-x-auto pb-8"
              onMouseDown={startDrag}
              onMouseMove={duringDrag}
              onMouseUp={endDrag}
              onMouseLeave={endDrag}
            >
              <div className="flex space-x-6 w-max cursor-grab active:cursor-grabbing">
                {works.map((project, index) => (
                  <div 
                    key={index} 
                    className={`w-80 flex-shrink-0 bg-[#1a1a1a] rounded-xl border border-gray-800 hover:border-emerald-500 transition-all overflow-hidden group ${activeProject?.id === project.id ? 'ring-2 ring-emerald-500' : ''}`}
                    onClick={() => setActiveProject(project)}
                  >
                    <div className="h-48 relative overflow-hidden">
                      <img 
                        src={project.attachment} 
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                        <a 
                          href={project.link} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-emerald-400 transition flex items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Visit Live Site <FiExternalLink className="ml-2" />
                        </a>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-xl font-medium">{project.title}</h4>
                        <span className="text-sm text-gray-400">2025</span>
                      </div>
                      <p className="text-gray-300 mb-4">{project.content}</p>
                      <div className="flex space-x-3">
                        <button className="text-sm px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-md hover:bg-emerald-500/20 transition">
                          View Details
                        </button>
                        <button className="text-sm px-4 py-2 border border-gray-700 rounded-md hover:bg-gray-800/50 transition flex items-center">
                          <FiGithub className="mr-2" /> Code
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Project details modal */}
            {activeProject && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setActiveProject(null)}>
                <div 
                  className="bg-[#1a1a1a] rounded-xl border border-gray-800 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative h-64 md:h-80">
                    <img 
                      src={activeProject.attachment} 
                      alt={activeProject.title}
                      className="w-full h-full object-cover"
                      loading="eager"
                    />
                    <button 
                      className="absolute top-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/80 transition"
                      onClick={() => setActiveProject(null)}
                    >
                      <FiX size={20} />
                    </button>
                  </div>
                  <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                      <h4 className="text-2xl md:text-3xl font-medium">{activeProject.title}</h4>
                      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <a 
                          href={activeProject.link} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-md hover:bg-emerald-500/20 transition flex items-center justify-center"
                        >
                          Visit Site <FiExternalLink className="ml-2" />
                        </a>
                        <button className="px-4 py-2 border border-gray-700 rounded-md hover:bg-gray-800/50 transition flex items-center justify-center">
                          <FiGithub className="mr-2" /> View Code
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-300 mb-6">{activeProject.content}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                      <div className="p-4 bg-[#0e0e0e] rounded-lg border border-gray-800">
                        <h5 className="text-sm text-gray-400 mb-1">Client</h5>
                        <p className="font-medium">Kopper Coffee</p>
                      </div>
                      <div className="p-4 bg-[#0e0e0e] rounded-lg border border-gray-800">
                        <h5 className="text-sm text-gray-400 mb-1">Year</h5>
                        <p className="font-medium">2025</p>
                      </div>
                      <div className="p-4 bg-[#0e0e0e] rounded-lg border border-gray-800">
                        <h5 className="text-sm text-gray-400 mb-1">Category</h5>
                        <p className="font-medium">Brand Website</p>
                      </div>
                    </div>
                    <h5 className="text-lg font-medium mb-4">Project Features</h5>
                    <ul className="space-y-3 text-gray-300 mb-8">
                      <li className="flex items-start">
                        <span className="text-emerald-400 mr-3">•</span> 
                        <span>Optimized performance with Next.js achieving 95+ Lighthouse score</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-emerald-400 mr-3">•</span> 
                        <span>Smooth parallax animations for immersive storytelling</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-emerald-400 mr-3">•</span> 
                        <span>Mobile-first layout designed specifically for Gen Z coffee lovers</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-emerald-400 mr-3">•</span> 
                        <span>Integrated with Shopify for seamless product management</span>
                      </li>
                    </ul>
                    <div className="flex justify-end">
                      <button 
                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-md hover:opacity-90 transition font-medium"
                        onClick={() => setActiveProject(null)}
                      >
                        Close Project
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section id="tech" className="relative z-10 px-6 py-16">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-sm uppercase tracking-widest text-emerald-400 mb-8 text-center">Technologies We Use</h3>
            <p className="text-2xl font-medium mb-12 text-center max-w-3xl mx-auto">
              Our toolkit for building exceptional digital products
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { name: 'Laravel', icon: '🚀' },
                { name: 'Next.js', icon: '⚡' },
                { name: 'React', icon: '🔮' },
                { name: 'Tailwind CSS', icon: '🎨' },
                { name: 'MySQL', icon: '🗃️' },
                { name: 'Node.js', icon: '🟢' },
                { name: 'Git', icon: '🔀' },
                { name: 'Figma', icon: '✏️' },
                { name: 'AWS', icon: '☁️' },
                { name: 'GraphQL', icon: '📊' }
              ].map((tech, index) => (
                <div 
                  key={index} 
                  className="px-4 py-2 bg-[#1a1a1a] rounded-full border border-gray-800 hover:border-emerald-500 transition hover:-translate-y-1 flex items-center"
                >
                  <span className="mr-2">{tech.icon}</span> {tech.name}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="relative z-10 px-6 py-16 md:py-32 bg-gradient-to-b from-[#0a0a0a] to-[#111]">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-sm uppercase tracking-widest text-emerald-400 mb-4 text-center">Get In Touch</h3>
            <p className="text-3xl md:text-4xl font-medium mb-12 text-center max-w-3xl mx-auto">
              Have a project in mind or want to discuss how we can help your business?
            </p>
            
            <div className="grid md:grid-cols-2 gap-8 md:gap-12">
              <div>
                <h4 className="text-xl font-medium mb-6">Our Office</h4>
                <p className="text-gray-300 mb-8">Jl. Sudirman No. 123, Tangerang Selatan, Indonesia 12190</p>
                
                <h4 className="text-xl font-medium mb-6">Email Us</h4>
                <p className="text-gray-300 mb-8">kacangpanjangstudio@gmail.com</p>
                
                <h4 className="text-xl font-medium mb-6">Call Us</h4>
                <p className="text-gray-300">0822 9780 9530</p>

                <div className="mt-12">
                  <h4 className="text-xl font-medium mb-6">Join Our Affiliate Program</h4>
                  <p className="text-gray-300 mb-6">
                    Earn commissions by referring clients to our services. Perfect for freelancers and agencies.
                  </p>
                  <a 
                    href="https://affiliate.kacangpanjang.id" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-md hover:opacity-90 transition font-medium"
                  >
                    Learn About Affiliate Program
                  </a>
                </div>
              </div>
              
              <div className="bg-[#1a1a1a] p-6 md:p-8 rounded-xl border border-gray-800 hover:shadow-emerald-500/10 transition">
                <h4 className="text-xl font-medium mb-6">Send Us a Message</h4>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Name</label>
                    <input 
                      type="text" 
                      placeholder="Your name" 
                      className="w-full px-4 py-3 bg-[#0e0e0e] border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Email</label>
                    <input 
                      type="email" 
                      placeholder="your@email.com" 
                      className="w-full px-4 py-3 bg-[#0e0e0e] border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Subject</label>
                    <input 
                      type="text" 
                      placeholder="Subject" 
                      className="w-full px-4 py-3 bg-[#0e0e0e] border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Message</label>
                    <textarea 
                      placeholder="Your message here..." 
                      rows={5}
                      className="w-full px-4 py-3 bg-[#0e0e0e] border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    ></textarea>
                  </div>
                  <button 
                    type="submit"
                    className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-md hover:opacity-90 transition font-medium"
                  >
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        <footer className="relative z-10 px-6 py-12 border-t border-gray-800">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
              <div>
                <div className="flex items-center mb-4">
                  <Image 
                    src="/favicon.ico" 
                    alt="kacangpanjang.id logo"
                    width={24}
                    height={24}
                    className="mr-2"
                  />
                  <h4 className="text-lg font-medium">kacangpanjang.id</h4>
                </div>
                <p className="text-gray-400">
                  A Tangerang-based digital studio specializing in web development, Web apps, and digital solutions.
                </p>
              </div>
              
              <div>
                <h4 className="text-lg font-medium mb-4">Services</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-emerald-400 transition">Web Development</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition">Web Apps</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition">UI/UX Design</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition">E-commerce</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition">DevOps</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-lg font-medium mb-4">Company</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-emerald-400 transition">About Us</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition">Our Work</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition">Careers</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition">Blog</a></li>
                  <li><a href="https://affiliate.kacangpanjang.id" className="hover:text-emerald-400 transition">Affiliate Program</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-lg font-medium mb-4">Contact</h4>
                <ul className="space-y-2 text-gray-400">
                  <li>Jl. Sudirman No. 123</li>
                  <li>Tangerang Selatan, Indonesia 12190</li>
                  <li>kacangpanjangstudio@gmail.com</li>
                  <li>0822 9780 9530</li>
                </ul>
              </div>
            </div>
            
            <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 mb-4 md:mb-0">© 2025 kacangpanjang.id. All rights reserved.</p>
              <div className="flex space-x-6">
                <a href="#" className="text-gray-400 hover:text-emerald-400 transition">Twitter</a>
                <a href="#" className="text-gray-400 hover:text-emerald-400 transition">Instagram</a>
                <a href="#" className="text-gray-400 hover:text-emerald-400 transition">LinkedIn</a>
                <a href="#" className="text-gray-400 hover:text-emerald-400 transition">Dribbble</a>
              </div>
            </div>
          </div>
        </footer>
      </main>

      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delay {
          animation: float 6s ease-in-out 2s infinite;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #1a1a1a;
        }
        ::-webkit-scrollbar-thumb {
          background: #10b981;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #34d399;
        }
      `}</style>
    </>
  );
}