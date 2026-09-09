'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  FiChevronsRight,
  FiUser,
  FiActivity,
  FiCreditCard,
  FiMessageSquare
} from "react-icons/fi";
import { createClient } from '@/utils/supabase/client';
import { IoMdRocket } from "react-icons/io";
import Image from "next/image";
import { Profile, ResearchSession, Team } from "@/types/main.db";
import { roleService } from "@/lib/role-service";
import { useThemeToggle, useLocalStorage } from '@/hooks/useFunctionalEffects';
import { pick, unique, filter, map } from '@/utils/functional';

interface SidebarProps {
  readonly isCollapsed: boolean;
  readonly setIsCollapsed: (isCollapsed: boolean) => void;
}

type NavItem = {
  readonly id: string;
  readonly href: string;
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly exact: boolean;
  readonly requiresAuth?: boolean;
  readonly adminOnly?: boolean;
};

type DropdownItem = {
  readonly id: string;
  readonly name: string;
  readonly href: string;
};

type UserState = {
  readonly profile: Profile | null;
  readonly teams: readonly Team[];
  readonly researchSessions: readonly ResearchSession[];
  readonly userRoles: readonly string[];
  readonly creditBalance: number;
  readonly loading: boolean;
};

// Pure navigation data
const NAVIGATION_ITEMS: readonly NavItem[] = [
  {
    id: 'dashboard',
    href: '/dashboard',
    icon: <FiHome className="text-lg" />,
    label: 'Dashboard',
    exact: true
  },
  {
    id: 'sessions',
    href: '/research',
    icon: <FiMessageSquare className="text-lg" />,
    label: 'Research',
    exact: false
  },
  {
    id: 'credits',
    href: '/credits',
    icon: <FiCreditCard className="text-lg" />,
    label: 'Credits',
    exact: true
  },
  {
    id: 'drafts',
    href: '/drafts',
    icon: <FiBook className="text-lg" />,
    label: 'Drafts',
    exact: true
  },
  {
    id: 'notifications',
    href: '/notifications',
    icon: <FiBell className="text-lg" />,
    label: 'Notifications',
    exact: true
  },
  {
    id: 'settings',
    href: '/settings',
    icon: <FiSettings className="text-lg" />,
    label: 'Settings',
    exact: true
  }
];

const ADMIN_NAVIGATION_ITEMS: readonly NavItem[] = [
  {
    id: 'admin-dashboard',
    href: '/admin/dashboard',
    icon: <FiHome className="text-lg" />,
    label: 'Admin Dashboard',
    exact: true,
    adminOnly: true
  },
  {
    id: 'admin-users',
    href: '/admin/users',
    icon: <FiUser className="text-lg" />,
    label: 'Users',
    exact: false,
    adminOnly: true
  },
  {
    id: 'admin-billing',
    href: '/admin/billing',
    icon: <FiSettings className="text-lg" />,
    label: 'Billing',
    exact: false,
    adminOnly: true
  },
  {
    id: 'admin-collaboration',
    href: '/admin/collaboration/research-sessions',
    icon: <FiUsers className="text-lg" />,
    label: 'Collaboration',
    exact: false,
    adminOnly: true
  },
  {
    id: 'admin-content',
    href: '/admin/content/tabs',
    icon: <FiArchive className="text-lg" />,
    label: 'Content',
    exact: false,
    adminOnly: true
  },
  {
    id: 'admin-ai',
    href: '/admin/ai-providers',
    icon: <FiSettings className="text-lg" />,
    label: 'AI Management',
    exact: false,
    adminOnly: true
  },
  {
    id: 'admin-system',
    href: '/admin/audit-log',
    icon: <FiActivity className="text-lg" />,
    label: 'System',
    exact: false,
    adminOnly: true
  }
];

// Pure component functions
const createUserData = (authUser: any, userProfile: any): Profile => ({
  id: authUser.id,
  email: authUser.email ?? '',
  full_name: userProfile?.full_name || authUser.user_metadata?.full_name || '',
  avatar_url: userProfile?.avatar_url || authUser.user_metadata?.avatar_url || '',
  settings: userProfile?.settings || {},
  created_at: new Date(userProfile?.created_at || new Date()),
  updated_at: new Date(userProfile?.updated_at || new Date()),
});

const transformResearchSessions = (sessions: any[]): readonly ResearchSession[] => 
  sessions.map(session => ({ ...session, createdAt: new Date(session.createdAt) }));

const transformTeams = (memberTeams: any[]): readonly Team[] => 
  memberTeams
    .map((mt: any) => mt.teams)
    .filter(Boolean);

const isNavItemActive = (item: NavItem, pathname: string): boolean =>
  item.exact ? pathname === item.href : pathname.startsWith(item.href);

// Component functions
const NavItemComponent: React.FC<{
  readonly item: NavItem;
  readonly pathname: string;
  readonly isCollapsed: boolean;
  readonly onClick: (href: string) => void;
}> = React.memo(({ item, pathname, isCollapsed, onClick }) => {
  const isActive = isNavItemActive(item, pathname);
  
  const handleClick = useCallback(() => {
    onClick(item.href);
  }, [onClick, item.href]);

  return (
    <li>
      <button
        onClick={handleClick}
        className={`w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
          isActive
            ? 'bg-orange-50 dark:bg-gray-800 text-orange-500 dark:text-orange-400 border-l-4 border-orange-500'
            : 'text-gray-900 dark:text-white hover:text-orange-500 dark:hover:text-orange-400'
        }`}
      >
        {item.icon}
        {!isCollapsed && <span className="ml-3 font-medium">{item.label}</span>}
      </button>
    </li>
  );
});

NavItemComponent.displayName = 'NavItemComponent';

const DropdownComponent: React.FC<{
  readonly title: string;
  readonly icon: React.ReactNode;
  readonly items: readonly DropdownItem[];
  readonly createPath?: string;
  readonly createLabel?: string;
  readonly isCollapsed: boolean;
  readonly isOpen: boolean;
  readonly pathname: string;
  readonly onToggle: () => void;
  readonly onItemClick: (href: string) => void;
  readonly onCreateClick?: () => void;
}> = React.memo(({ 
  title, 
  icon, 
  items, 
  createPath, 
  createLabel,
  isCollapsed, 
  isOpen, 
  pathname,
  onToggle, 
  onItemClick, 
  onCreateClick 
}) => {
  const isActive = pathname.startsWith(createPath?.split('/')[1] || title.toLowerCase());
  
  const containerClasses = useMemo(() => 
    `w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
      isActive
        ? 'bg-orange-50 dark:bg-gray-800 text-orange-500 dark:text-orange-400 border-l-4 border-orange-500'
        : 'text-gray-900 dark:text-white hover:text-orange-500 dark:hover:text-orange-400'
    }`
  , [isActive]);

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className={containerClasses}
      >
        <div className="flex items-center">
          {icon}
          {!isCollapsed && <span className="ml-3 font-medium">{title}</span>}
        </div>
        {!isCollapsed && (
          <span className="ml-2">
            {isOpen ? <FiChevronUp /> : <FiChevronDown />}
          </span>
        )}
      </button>
      
      {!isCollapsed && isOpen && (
        <ul className="ml-8 mt-1 space-y-1 animate-in slide-in-from-top-1">
          {items.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onItemClick(item.href)}
                className={`w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-sm transition-colors ${
                  pathname === item.href
                    ? 'text-orange-500 dark:text-orange-400 font-medium bg-orange-50 dark:bg-gray-800'
                    : 'text-gray-700 dark:text-gray-300 hover:text-orange-500 dark:hover:text-orange-400'
                }`}
              >
                <span className="truncate text-left">{item.name}</span>
              </button>
            </li>
          ))}
          
          {createPath && onCreateClick && (
            <li>
              <button
                onClick={onCreateClick}
                className="w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm hover:text-orange-500 dark:hover:text-orange-400 transition-colors border border-dashed border-gray-300 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-600"
              >
                <FiPlusCircle className="mr-2 text-sm flex-shrink-0" />
                <span>{createLabel || `New ${title.slice(0, -1)}`}</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </li>
  );
});

DropdownComponent.displayName = 'DropdownComponent';

const UserProfileSection: React.FC<{
  readonly profile: Profile | null;
  readonly isCollapsed: boolean;
  readonly onProfileClick: () => void;
  readonly onLogout: () => void;
  readonly onThemeToggle: () => void;
  readonly theme: 'light' | 'dark';
}> = React.memo(({ 
  profile, 
  isCollapsed, 
  onProfileClick, 
  onLogout, 
  onThemeToggle,
  theme 
}) => {
  if (!profile) return null;

  return (
    <div className="p-3 border-t border-gray-200 dark:border-gray-700">
      <div className={`flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
        isCollapsed ? 'justify-center' : ''
      }`}>
        <button
          onClick={onProfileClick}
          className="flex items-center flex-shrink-0"
        >
          <Image 
            className="w-8 h-8 rounded-full ring-2 ring-gray-200 dark:ring-gray-600" 
            src={profile.avatar_url || '/default-avatar.png'} 
            alt={profile.full_name || profile.email}
            width={32} 
            height={32} 
          />
        </button>
        
        {!isCollapsed && (
          <div className="ml-3 flex-1 min-w-0">
            <button
              onClick={onProfileClick}
              className="w-full text-left"
            >
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {profile.full_name || profile.email}
              </p>
              {profile.full_name && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {profile.email}
                </p>
              )}
            </button>
          </div>
        )}
        
        <div className="flex items-center space-x-1">
          <button 
            onClick={onThemeToggle} 
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <FiMoon className="w-4 h-4" /> : <FiSun className="w-4 h-4" />}
          </button>
          
          <button
            onClick={onLogout}
            className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Sign out"
          >
            <FiLogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

UserProfileSection.displayName = 'UserProfileSection';

// Main Sidebar Component
const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  
  const { toggleTheme, getTheme } = useThemeToggle();
  const [dropdownStates, setDropdownStates] = useLocalStorage('sidebar-dropdowns', {
    research: false,
    teams: false
  });
  
  const [userState, setUserState] = useState<UserState>({
    profile: null,
    teams: [],
    researchSessions: [],
    userRoles: [],
    creditBalance: 0,
    loading: true
  });

  // Pure data transformation functions
  const transformResearchSessionsToDropdown = useCallback((sessions: readonly ResearchSession[]): readonly DropdownItem[] =>
    map((session: ResearchSession) => ({
      id: session.id,
      name: session.title,
      href: `/session/${session.id}`
    }))(sessions)
  , []);

  const transformTeamsToDropdown = useCallback((teams: readonly Team[]): readonly DropdownItem[] =>
    map((team: Team) => ({
      id: team.id,
      name: team.name,
      href: `/team/${team.id}`
    }))(teams)
  , []);

  // Memoized computed values
  const researchDropdownItems = useMemo(() => 
    transformResearchSessionsToDropdown(userState.researchSessions),
    [userState.researchSessions, transformResearchSessionsToDropdown]
  );

  const teamsDropdownItems = useMemo(() => 
    transformTeamsToDropdown(userState.teams),
    [userState.teams, transformTeamsToDropdown]
  );

  const visibleAdminItems = useMemo(() => 
    filter((item: NavItem) => !item.adminOnly || userState.userRoles.includes('admin'))(ADMIN_NAVIGATION_ITEMS),
    [userState.userRoles]
  );

  // Event handlers
  const handleNavigation = useCallback((href: string) => {
    router.push(href);
  }, [router]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/sign-in');
  }, [supabase, router]);

  const handleDropdownToggle = useCallback((dropdownName: keyof typeof dropdownStates) => {
    setDropdownStates(prev => ({
      ...prev,
      [dropdownName]: !prev[dropdownName]
    }));
  }, [setDropdownStates]);

  const initializeUserData = useCallback(async () => {
    try {
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

      const [userRoles, researchSessions, memberTeams, creditData] = await Promise.all([
        roleService.getUserRoles(authUser.id),
        supabase
          .from('research_sessions')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('team_members')
          .select('teams(*)')
          .eq('user_id', authUser.id),
        supabase
          .from('user_credits')
          .select('balance')
          .eq('user_id', authUser.id)
          .single()
      ]);

      const profile = createUserData(authUser, userProfile);
      const teams = transformTeams(memberTeams?.data || []);
      const sessions = transformResearchSessions(researchSessions.data || []);

      setUserState({
        profile,
        teams,
        researchSessions: sessions,
        userRoles: unique(userRoles.map(r => r.name)),
        creditBalance: creditData?.data?.balance || 0,
        loading: false
      });
    } catch (error) {
      console.error('Error initializing user data:', error);
      setUserState(prev => ({ ...prev, loading: false }));
    }
  }, [supabase, router]);

  useEffect(() => {
    initializeUserData();
  }, [initializeUserData]);

  if (userState.loading) {
    return (
      <aside className={`fixed top-0 left-0 z-30 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse flex space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
        aria-label="Sidebar"
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            {!isCollapsed && (
              <button 
                className="flex items-center hover:opacity-80 transition-opacity"
                onClick={() => handleNavigation('/')}
              >
                <IoMdRocket className="text-orange-500 text-2xl" />
                <span className="ml-2 font-bold text-xl dark:text-white">Tabwise</span>
              </button>
            )}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)} 
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <FiChevronsRight /> : <FiChevronsLeft />}
            </button>
          </div>

          {/* Credit Balance */}
          <button
            onClick={() => handleNavigation('/credits')}
            className={`mx-3 mt-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors ${
              isCollapsed ? 'flex justify-center' : ''
            }`}
          >
            <div className={`flex items-center ${isCollapsed ? '' : 'justify-between'}`}>
              <div className="flex items-center gap-2">
                <FiCreditCard className="w-4 h-4 text-orange-500" />
                {!isCollapsed && <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Credits</span>}
              </div>
              {!isCollapsed && (
                <span className="text-sm font-bold text-orange-700 dark:text-orange-300">
                  {userState.creditBalance.toLocaleString()}
                </span>
              )}
            </div>
          </button>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-2">
            <ul className="space-y-1 px-2">
              {NAVIGATION_ITEMS.map(item => (
                <NavItemComponent
                  key={item.id}
                  item={item}
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                  onClick={handleNavigation}
                />
              ))}
              
              <DropdownComponent
                title="Research"
                icon={<FiArchive className="text-lg" />}
                items={researchDropdownItems}
                createPath="/research/new"
                createLabel="New Research"
                isCollapsed={isCollapsed}
                isOpen={dropdownStates.research}
                pathname={pathname}
                onToggle={() => handleDropdownToggle('research')}
                onItemClick={handleNavigation}
                onCreateClick={() => handleNavigation('/research/new')}
              />
              
              <DropdownComponent
                title="Teams"
                icon={<FiUsers className="text-lg" />}
                items={teamsDropdownItems}
                createPath="/team/create"
                createLabel="New Team"
                isCollapsed={isCollapsed}
                isOpen={dropdownStates.teams}
                pathname={pathname}
                onToggle={() => handleDropdownToggle('teams')}
                onItemClick={handleNavigation}
                onCreateClick={() => handleNavigation('/team/create')}
              />
              
              {/* Admin Section */}
              {visibleAdminItems.length > 0 && (
                <li className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between p-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <span>Admin</span>
                  </div>
                  <ul className="mt-1 space-y-1">
                    {visibleAdminItems.map(item => (
                      <NavItemComponent
                        key={item.id}
                        item={item}
                        pathname={pathname}
                        isCollapsed={isCollapsed}
                        onClick={handleNavigation}
                      />
                    ))}
                  </ul>
                </li>
              )}
            </ul>
          </nav>

          {/* User Profile */}
          <UserProfileSection
            profile={userState.profile}
            isCollapsed={isCollapsed}
            onProfileClick={() => handleNavigation('/profile')}
            onLogout={handleLogout}
            onThemeToggle={toggleTheme}
            theme={getTheme()}
          />
        </div>
      </aside>
    </>
  );
};

export default React.memo(Sidebar);