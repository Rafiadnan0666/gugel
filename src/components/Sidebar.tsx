'use client';
import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from 'next/navigation'; 
import { 
  FiHome, 
  FiUsers, 
  FiBell, 
  FiPlusCircle, 
  FiChevronDown, 
  FiChevronUp, 
  FiLogOut,
  FiSettings,
  FiBook,
  FiArchive,
  FiMoon,
  FiSun,
  FiChevronsLeft,
  FiChevronsRight
} from "react-icons/fi";
import { createClient } from '@/utils/supabase/client';
import { IoMdRocket } from "react-icons/io";
import Image from "next/image";
import { IProfile, IResearchSession, ITeam } from "@/types/main.db";


const Sidebar: React.FC<{ isCollapsed: boolean; setIsCollapsed: (isCollapsed: boolean) => void }> = ({ isCollapsed, setIsCollapsed }) => {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [teams, setTeams] = useState<ITeam[]>([]);
  const [researchSessions, setResearchSessions] = useState<IResearchSession[]>([]);





  const [user, setUser] = useState<IProfile | null>(null);




  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const fetchResearchSessions = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('research_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setResearchSessions(data);
    }
  }, [supabase]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      
      if (error || !authUser) {
        router.push('/sign-in');
        return;
      }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      const userData: IProfile = {
        id: authUser.id,
        email: authUser.email ?? '',
        full_name: userProfile?.full_name || authUser.user_metadata?.full_name || '',
        avatar_url: userProfile?.avatar_url || authUser.user_metadata?.avatar_url || '',
        created_at: new Date(userProfile?.created_at || new Date()),
        updated_at: new Date(userProfile?.updated_at || new Date()),
      };

      setUser(userData);

      const { data: memberTeams } = await supabase
        .from('team_members')
        .select('teams(*)')
        .eq('user_id', authUser.id);
      
      const allTeams: ITeam[] = memberTeams?.map((mt: any) => mt.teams).filter(Boolean) as ITeam[] || [];
      setTeams(allTeams);

      await fetchResearchSessions(authUser.id);
    };

    fetchData();
  }, [supabase, router, fetchResearchSessions]);



  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/sign-in');
  };





  const NavItem: React.FC<{ href: string; icon: React.ReactNode; label: string; exact?: boolean }> = ({ href, icon, label, exact }) => {
    const isActive = exact ? pathname === href : pathname.startsWith(href);
    return (
      <li>
        <button
          onClick={() => router.push(href)}
          className={`w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 ${
            isActive
              ? 'bg-orange-50 dark:bg-gray-800 text-orange-500 dark:text-orange-400'
              : 'text-gray-900 dark:text-white'
          }`}
        >
          {icon}
          {!isCollapsed && <span className="ml-3">{label}</span>}
        </button>
      </li>
    );
  };

  const Dropdown: React.FC<{ title: string; icon: React.ReactNode; items: (ITeam | IResearchSession)[]; pathPrefix: string; nameKey: string; idKey?: string; createPath?: string }> = ({ title, icon, items, pathPrefix, nameKey, idKey = 'id', createPath }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <li>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 ${
            pathname.startsWith(pathPrefix)
              ? 'bg-orange-50 dark:bg-gray-800 text-orange-500 dark:text-orange-400'
              : 'text-gray-900 dark:text-white'
          }`}
        >
          <div className="flex items-center">
            {icon}
            {!isCollapsed && <span className="ml-3">{title}</span>}
          </div>
          {!isCollapsed && (isOpen ? <FiChevronUp /> : <FiChevronDown />)}
        </button>
        {!isCollapsed && isOpen && (
          <ul className="ml-8 mt-1 space-y-1">
            {items.map((item) => (
              <li key={item[idKey]}>
                <button
                  onClick={() => router.push(`${pathPrefix}/${item[idKey]}`)}
                  className={`w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-sm ${
                    pathname === `${pathPrefix}/${item[idKey]}`
                      ? 'text-orange-500 dark:text-orange-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="truncate">{item[nameKey]}</span>
                </button>
              </li>
            ))}
            {createPath && (
              <li>
                <button
                  onClick={() => router.push(createPath)}
                  className="w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm"
                >
                  <FiPlusCircle className="mr-2 text-sm" />
                  New {title.slice(0, -1)}
                </button>
              </li>
            )}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        {/* ... mobile header content ... */}
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 h-screen mr-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
        aria-label="Sidebar"
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            {!isCollapsed && (
              <div 
                className="flex items-center cursor-pointer"
                onClick={() => router.push('/')}
              >
                <IoMdRocket className="text-orange-500 text-2xl" />
                <span className="ml-2 font-bold text-xl dark:text-white">Tabwise</span>
              </div>
            )}
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
              {isCollapsed ? <FiChevronsRight /> : <FiChevronsLeft />}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-2">
            <ul className="space-y-1 px-2">
              <NavItem href="/dashboard" icon={<FiHome className="text-lg" />} label="Dashboard" exact />
              <Dropdown title="Research" icon={<FiArchive className="text-lg" />} items={researchSessions} pathPrefix="/session" nameKey="title" createPath="/research/new" />
              <Dropdown title="Teams" icon={<FiUsers className="text-lg" />} items={teams} pathPrefix="/team" nameKey="name" createPath="/team/create" />
              <NavItem href="/drafts" icon={<FiBook className="text-lg" />} label="Drafts" />
              <NavItem href="/notifications" icon={<FiBell className="text-lg" />} label="Notifications" />
              <NavItem href="/settings" icon={<FiSettings className="text-lg" />} label="Settings" />
            </ul>
          </nav>

          {user && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <div className={`flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 ${
                isCollapsed ? 'justify-center' : ''
              }`}>
                <div 
                  onClick={() => router.push('/profile')}
                >
                  <Image className="w-8 h-8 rounded-full" src={user.avatar_url || '/default-avatar.png'} alt="" width={32} height={32} />
                </div>
                {!isCollapsed && (
                  <div 
                    className="ml-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => router.push('/profile')}
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.full_name || user.email}
                    </p>
                  </div>
                )}
                <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                  {theme === 'light' ? <FiMoon /> : <FiSun />}
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <FiLogOut />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div className={`pt-16 md:pt-0 min-h-screen bg-gray-50 dark:bg-gray-900 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'md:ml-20' : 'md:ml-64'
      }`}>
        {/* Content will be rendered here */}
      </div>
    </>
  );
};

export default Sidebar;
