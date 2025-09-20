'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { INotification, IUser } from '@/types/main.db';
import { FiMail, FiBell, FiCheck, FiMessageSquare, FiThumbsUp, FiUserPlus, FiShare2 } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function Notifications() {
  const [authUser, setAuthUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/sign-in');
        return;
      }

      setAuthUser({
        id: user.id,
        email: user.email ?? '',
        full_name: user.user_metadata?.full_name ?? '',
        name: '',
        password: '',
        created_at: new Date(),
        updated_at: new Date(),
      });
      setLoading(false);
    };

    fetchUser();
  }, [router, supabase]);

  const fetchNotifications = useCallback(async (pageNum: number) => {
    if (!authUser) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .range((pageNum - 1) * 10, pageNum * 10 - 1);

      if (activeTab === 'unread') {
        query = query.eq('read', false);
      }

      const { data: notificationsData } = await query;
      
      if (!notificationsData || notificationsData.length === 0) {
        setHasMore(false);
        return;
      }

      if (pageNum === 1) {
        setNotifications(notificationsData);
      } else {
        setNotifications(prev => [...prev, ...notificationsData]);
      }

      setHasMore(notificationsData.length === 10);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [authUser, supabase, activeTab]);

  useEffect(() => {
    fetchNotifications(page);
  }, [page, fetchNotifications]);

  const handleScroll = useCallback(() => {
    if (loading || !hasMore) return;

    const { scrollTop, clientHeight, scrollHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const markAsRead = async (notificationId: number) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
      
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', authUser?.id)
        .eq('read', false);
      
      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <FiMessageSquare className="text-blue-500" />;
      case 'like':
        return <FiThumbsUp className="text-red-500" />;
      case 'follow':
        return <FiUserPlus className="text-green-500" />;
      case 'mention':
        return <FiShare2 className="text-purple-500" />;
      default:
        return <FiBell className="text-orange-500" />;
    }
  };

  const getNotificationText = (type: string, payload: string) => {
    try {
      const payloadObj = JSON.parse(payload);
      switch (type) {
        case 'message':
          return `New message from ${payloadObj.sender}`;
        case 'like':
          return `${payloadObj.user} liked your post "${payloadObj.postTitle}"`;
        case 'follow':
          return `${payloadObj.user} started following you`;
        case 'mention':
          return `${payloadObj.user} mentioned you in a post`;
        default:
          return payload;
      }
    } catch {
      return payload;
    }
  };

  if (loading && page === 1) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-100 pt-16">
          <div className="max-w-4xl mx-auto p-4">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-md shadow p-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 pt-16">
        <div className="max-w-4xl mx-auto p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <button 
              onClick={markAllAsRead}
              className="text-sm text-blue-500 hover:text-blue-700 font-medium"
              disabled={notifications.every(n => n.read)}
            >
              Mark all as read
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'all' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => {
                setActiveTab('all');
                setPage(1);
                setHasMore(true);
              }}
            >
              All
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'unread' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => {
                setActiveTab('unread');
                setPage(1);
                setHasMore(true);
              }}
            >
              Unread
            </button>
          </div>

          {/* Notifications list */}
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="bg-white rounded-md shadow p-8 text-center">
                <FiMail className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No notifications</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {activeTab === 'all' 
                    ? "You don't have any notifications yet." 
                    : "You don't have any unread notifications."}
                </p>
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`bg-white rounded-md shadow p-4 ${!notification.read ? 'border-l-4 border-blue-500' : ''}`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        {getNotificationText(notification.type, notification.payload)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-500"
                        title="Mark as read"
                      >
                        <FiCheck className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {loading && page > 1 && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}

          {!hasMore && !loading && notifications.length > 0 && (
            <div className="text-center py-6 text-gray-500">
              Youve reached the end of your notifications
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}