// ProfilePage.tsx
// A full rewrite of the former Dashboard component, repurposed as a Reddit‑style Profile page.
// It shows the authenticated user's Supabase profile, lists their posts, and lets them edit their profile.

'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IUser, IPost, IProfile } from '@/types/main.db';
import { FiEdit2, FiExternalLink } from 'react-icons/fi';

interface EditProfileState {
  full_name: string;
  avatar_url: string;
  email: string;
}

export default function ProfilePage() {
  /* ────────────────────────────────
   * STATE
   * ────────────────────────────── */
  const [authUser, setAuthUser] = useState<IUser | null>(null);
  const [profile, setProfile] = useState<IProfile | null>(null);
  const [posts, setPosts] = useState<IPost[]>([]);
  const [loading, setLoading] = useState(true);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editState, setEditState] = useState<EditProfileState>({
    full_name: '',
    avatar_url: '',
    email: '',
  });
  const [saveError, setSaveError] = useState<string | null>(null);

  /* ────────────────────────────────
   * SUPABASE & ROUTER
   * ────────────────────────────── */
  const router = useRouter();
  const supabase = createClient();

  /* ────────────────────────────────
   * FETCH AUTH USER
   * ────────────────────────────── */
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

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
    };

    fetchUser();
  }, [router, supabase]);

  /* ────────────────────────────────
   * FETCH PROFILE & POSTS
   * ────────────────────────────── */
  const fetchProfileData = async () => {
    if (!authUser) return;

    try {
      // Get profile row (1‑to‑1 with auth.users)
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileErr) throw profileErr;
      setProfile(profileData as IProfile);

      // Fetch posts written by the user
      const { data: postsData, error: postsErr } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (postsErr) throw postsErr;
      setPosts(postsData || []);
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authUser) fetchProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

  /* ────────────────────────────────
   * EDIT PROFILE HANDLERS
   * ────────────────────────────── */
  const openEditModal = () => {
    if (!profile) return;
    setEditState({
      full_name: profile.full_name ?? '',
      avatar_url: profile.avatar_url ?? '',
      email: profile.email ?? '',
    });
    setSaveError(null);
    setShowEditModal(true);
  };

  const handleProfileSave = async () => {
    if (!authUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editState.full_name.trim(),
          avatar_url: editState.avatar_url.trim(),
          email: editState.email.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUser.id);

      if (error) throw error;
      setShowEditModal(false);
      await fetchProfileData();
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setSaveError(err.message || 'Failed to update profile');
    }
  };

  /* ────────────────────────────────
   * RENDER
   * ────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black" />
      </div>
    );
  }

  return (
    <Layout>
      <main className="min-h-screen bg-gray-50 pt-24 font-poppins">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left – Profile Card */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow p-6 sticky top-28">
              <div className="flex flex-col items-center text-center">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-24 h-24 rounded-full object-cover mb-3"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-3 text-2xl">
                    👤
                  </div>
                )}
                <small>  user id : {authUser.id}</small>
                <h2 className="text-xl font-semibold">{profile?.full_name || 'Anonymous'}</h2>
                <p className="text-sm text-gray-600">{profile?.email}</p>
                <button
                  onClick={openEditModal}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  <FiEdit2 /> Edit Profile
                </button>
              </div>
            </div>
          </aside>

          {/* Right – Posts List */}
          <section className="lg:col-span-2 space-y-6">
            <h1 className="text-3xl font-bold mb-2">Posts by {profile?.full_name || 'you'}</h1>
            {posts.length === 0 ? (
              <p className="text-gray-600">You haven’t posted anything yet. Start sharing your thoughts!</p>
            ) : (
              posts.map((post) => (
                <article
                  key={post.id}
                  className="bg-white rounded-lg shadow hover:shadow-md transition border border-gray-200"
                >
                  <div className="p-6">
                    <h2 className="text-lg font-semibold mb-2">{post.title}</h2>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">
                      {post.content?.slice(0, 300)}{post.content && post.content.length > 300 && '…'}
                    </p>
                    {post.attachment && (
                      <a
                        href={post.attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 text-sm inline-flex items-center gap-1 hover:underline"
                      >
                        Attachment <FiExternalLink />
                      </a>
                    )}
                  </div>
                  <footer className="px-6 pb-4 text-xs text-gray-500">
                    {new Date(post.created_at).toLocaleString()}
                  </footer>
                </article>
              ))
            )}
          </section>
        </div>

        {/* Edit Profile Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-semibold mb-4">Edit Profile</h3>

              {saveError && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{saveError}</div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    value={editState.full_name}
                    onChange={(e) => setEditState({ ...editState, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label htmlFor="avatarUrl" className="block text-sm font-medium text-gray-700 mb-1">
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    id="avatarUrl"
                    value={editState.avatar_url}
                    onChange={(e) => setEditState({ ...editState, avatar_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Link to your avatar image"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={editState.email}
                    onChange={(e) => setEditState({ ...editState, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your email address"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProfileSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
