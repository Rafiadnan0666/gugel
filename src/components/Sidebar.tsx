'use client';
import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from 'next/navigation'; 
import { 
  FiHome, 
  FiUsers, 
  FiMessageSquare, 
  FiBell, 
  FiPlusCircle, 
  FiSearch, 
  FiMenu, 
  FiX, 
  FiChevronDown, 
  FiChevronUp, 
  FiLogOut,
  FiUser,
  FiSettings,
  FiActivity
} from "react-icons/fi";
import { createClient } from '@/utils/supabase/client';
import { IoMdRocket } from "react-icons/io";
import { RiCompassDiscoverLine } from "react-icons/ri";
import { debounce } from 'lodash';
import type { IUser, ITeam, INotification } from '@/types/main.db';

const Sidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [isTeamsDropdownOpen, setIsTeamsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [user, setUser] = useState<IUser | null>(null);
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch user data and teams
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      
      if (error || !authUser) {
        router.push('/sign-in');
        return;
      }

      // Fetch user profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      const userData: IUser = {
        id: authUser.id,
        email: authUser.email ?? '',
        full_name: userProfile?.full_name || authUser.user_metadata?.full_name || '',
        name: userProfile?.name || authUser.user_metadata?.name || '',
        password: '',
        created_at: new Date(userProfile?.created_at || new Date()),
        updated_at: new Date(userProfile?.updated_at || new Date()),
      };

      setUser(userData);

      // Fetch teams user is member of
      const { data: memberTeams } = await supabase
        .from('member_team')
        .select('teams(*)')
        .eq('user_id', authUser.id);
      
      const allTeams = memberTeams?.map((mt: any) => mt.teams).filter(Boolean) || [];
      setTeams(allTeams);

      // Fetch notifications
      await fetchNotifications(authUser.id);
    };

    fetchData();
  }, [supabase, router]);

  // Fetch notifications
  const fetchNotifications = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }
  }, [supabase]);

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationId?: number) => {
    if (!user) return;

    if (notificationId) {
      // Mark single notification as read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
    } else {
      // Mark all notifications as read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
    }

    await fetchNotifications(user.id);
  }, [supabase, user, fetchNotifications]);

  // Search handler with debounce
  const handleSearch = useCallback(debounce(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      // Search posts
      const { data: posts } = await supabase
        .from('posts')
        .select('id, title, slug')
        .ilike('title', `%${query}%`)
        .eq('visibility', 'public')
        .limit(5);

      // Search teams
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .ilike('name', `%${query}%`)
         .eq('visibility', 'public')
        .limit(5);

      // Search users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, name, full_name')
        .or(`name.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(5);

      setSearchResults([
        ...(posts?.map(p => ({ ...p, type: 'post' })) || []),
        ...(teams?.map(t => ({ ...t, type: 'team' })) || []),
        ...(users?.map(u => ({ ...u, type: 'user' })) || [])
      ]);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  }, 300), [supabase]);

  useEffect(() => {
    handleSearch(searchQuery);
    return () => handleSearch.cancel();
  }, [searchQuery, handleSearch]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/sign-in');
  };

  const navigateTo = (path: string) => {
    router.push(path);
    setIsMobileMenuOpen(false);
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleSearchItemClick = (item: any) => {
    switch (item.type) {
      case 'post':
        navigateTo(`/post/${item.slug}`);
        break;
      case 'team':
        navigateTo(`/team/${item.id}`);
        break;
      case 'user':
        navigateTo(`/user/${item.id}`);
        break;
      default:
        break;
    }
  };

  return (
    <>
      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
            <div 
              className="flex items-center ml-4 cursor-pointer"
              onClick={() => navigateTo('/')}
            >
              <IoMdRocket className="text-orange-500 text-2xl" />
              <span className="ml-2 font-bold text-lg dark:text-white">Ideas</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 relative"
              onClick={() => navigateTo('/notifications')}
            >
              <FiBell className="text-gray-700 dark:text-gray-200" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {user && (
              <div 
                className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-medium cursor-pointer"
                onClick={() => navigateTo('/profile')}
              >
                {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 w-64 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
        aria-label="Sidebar"
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div 
            className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer"
            onClick={() => navigateTo('/')}
          >
            <IoMdRocket className="text-orange-500 text-2xl" />
            <span className="ml-2 font-bold text-xl dark:text-white">Ideas</span>
          </div>

          {/* Search bar */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 relative">
            <form onSubmit={(e) => e.preventDefault()} className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Search posts, teams, users..."
              />
            </form>

            {/* Search results dropdown */}
            {isSearchFocused && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
                {searchResults.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0"
                    onMouseDown={() => handleSearchItemClick(item)}
                  >
                    <div className="flex items-center">
                      {item.type === 'post' && (
                        <>
                          <FiMessageSquare className="text-orange-500 mr-2" />
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Post</p>
                          </div>
                        </>
                      )}
                      {item.type === 'team' && (
                        <>
                          <FiUsers className="text-blue-500 mr-2" />
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Team</p>
                          </div>
                        </>
                      )}
                      {item.type === 'user' && (
                        <>
                          <FiUser className="text-green-500 mr-2" />
                          <div>
                            <p className="font-medium">{item.name || item.full_name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">User</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Main navigation */}
          <nav className="flex-1 overflow-y-auto py-2">
            <ul className="space-y-1 px-2">
              <li>
                <button
                  onClick={() => navigateTo('/dashboard')}
                  className={`w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    pathname === '/dashboard' 
                      ? 'bg-orange-50 dark:bg-gray-800 text-orange-500 dark:text-orange-400' 
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  <FiHome className="text-lg" />
                  <span className="ml-3">Home</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('/explore')}
                  className={`w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    pathname === '/explore' 
                      ? 'bg-orange-50 dark:bg-gray-800 text-orange-500 dark:text-orange-400' 
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  <RiCompassDiscoverLine className="text-lg" />
                  <span className="ml-3">Explore</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsTeamsDropdownOpen(!isTeamsDropdownOpen)}
                  className={`w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    pathname.startsWith('/team') 
                      ? 'bg-orange-50 dark:bg-gray-800 text-orange-500 dark:text-orange-400' 
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <FiUsers className="text-lg" />
                    <span className="ml-3">Teams</span>
                  </div>
                  {isTeamsDropdownOpen ? (
                    <FiChevronUp className="text-gray-500" />
                  ) : (
                    <FiChevronDown className="text-gray-500" />
                  )}
                </button>
                {isTeamsDropdownOpen && (
                  <ul className="ml-8 mt-1 space-y-1">
                    {teams.map((team) => (
                      <li key={team.id}>
                        <button
                          onClick={() => navigateTo(`/team/${team.id}`)}
                          className={`w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-sm ${
                            pathname === `/team/${team.id}`
                              ? 'text-orange-500 dark:text-orange-400 font-medium'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <span className="truncate">t/{team.name}</span>
                        </button>
                      </li>
                    ))}
                    <li>
                      <button
                        onClick={() => navigateTo('/team/create')}
                        className="w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm"
                      >
                        {/* <FiPlusCircle className="mr-2" />
                        Create Team */}
                      </button>
                    </li>
                  </ul>
                )}
              </li>
              <li>
                <button
                  onClick={() => navigateTo('/messages')}
                  className={`w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    pathname === '/messages' 
                      ? 'bg-orange-50 dark:bg-gray-800 text-orange-500 dark:text-orange-400' 
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  <FiMessageSquare className="text-lg" />
                  <span className="ml-3">Messages</span>
                </button>
              </li>
                 <li>
                <button
                  onClick={() => navigateTo('/blogs')}
                  className={`w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    pathname === '/blogs' 
                      ? 'bg-orange-50 dark:bg-gray-800 text-orange-500 dark:text-orange-400' 
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  <FiActivity className="text-lg" />
                  <span className="ml-3">blogs</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('/notifications')}
                  className={`w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 relative ${
                    pathname === '/notifications' 
                      ? 'bg-orange-50 dark:bg-gray-800 text-orange-500 dark:text-orange-400' 
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  <FiBell className="text-lg" />
                  <span className="ml-3">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="ml-auto bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </li>
              {/* <li>
                <button
                  onClick={() => navigateTo('/settings')}
                  className={`w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    pathname === '/settings' 
                      ? 'bg-orange-50 dark:bg-gray-800 text-orange-500 dark:text-orange-400' 
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  <FiSettings className="text-lg" />
                  <span className="ml-3">Settings</span>
                </button>
              </li> */}
            </ul>

            {/* Create post button */}
            <div className="p-3 mt-4">
             <button
  onClick={() => window.open('https://ko-fi.com/gregsea', '_blank')}
  className="w-full bg-pink-500 hover:bg-pink-600 text-white rounded-full py-2 px-4 font-semibold flex items-center justify-center transition-colors duration-200 shadow-md"
>
  <FiPlusCircle className="mr-2" />
  Buy me a Ko-fi ❤️
</button>

            </div>
          </nav>

          {/* User section */}
          {user && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                <div 
                  className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-medium cursor-pointer"
                  onClick={() => navigateTo('/profile')}
                >
                  {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                </div>
                <div 
                  className="ml-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigateTo('/profile')}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.name || user.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.full_name || 'Member'}
                  </p>
                </div>
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

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main content area */}
      <div className="md:ml-64 pt-16 md:pt-0 min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Notification dropdown (example) */}
        {/* You can implement a proper dropdown component here */}
      </div>
    </>
  );
};

export default Sidebar;