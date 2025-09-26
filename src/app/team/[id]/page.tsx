'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IResearchSession, ITeam, IProfile, ITeamMember, ITeamMessage } from '@/types/main.db';
import { 
  FiPlus, FiUsers, FiUser, FiTrash2, FiMessageSquare, 
  FiSearch, FiExternalLink, FiBarChart2, FiClock, 
  FiDownload, FiSend, FiGlobe, FiSettings, FiActivity, 
  FiFileText, FiCopy, FiCheck, FiTrendingUp, FiEye,
  FiRefreshCw, FiUserPlus, FiSliders, FiDatabase,
  FiTarget, FiLock, FiAward, FiThumbsUp, FiThumbsDown, 
  FiZap, FiFilter, FiMoreVertical, FiAnchor, FiEdit3,
  FiX, FiShare2, FiBell, FiStar, FiGitBranch, FiGitPullRequest,
  FiCalendar, FiPieChart, FiBarChart, FiUsers as FiUsersIcon,
  FiVolume2, FiVideo, FiMail, FiLink, FiShield, FiAlertCircle
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';

// AI Service Hook
const useAIService = () => {
  const [aiSession, setAiSession] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<'loading' | 'ready' | 'error' | 'unavailable'>('loading');

  useEffect(() => {
    const initializeAI = async () => {
      try {
        const opts = { expectedOutputs: [{ type: "text", languages: ["en"] }] };
        const availability = await (window as any).LanguageModel.availability(opts);
        if (availability === "unavailable") {
          setAiStatus('unavailable');
          return;
        }
        const session = await (window as any).LanguageModel.create(opts);
        setAiSession(session);
        setAiStatus('ready');
      } catch (err) {
        setAiStatus('error');
      }
    };
    if ((window as any).LanguageModel) initializeAI();
    else setAiStatus('error');
  }, []);

  const cleanAIResponse = (text: string) => text.replace(/##/g, '').replace(/\*\*/g, '').trim();

  const promptAI = async (prompt: string) => {
    if (!aiSession) return "AI not available";
    try {
      const result = await aiSession.prompt(prompt);
      return cleanAIResponse(result);
    } catch (error) {
      return "Error from AI";
    }
  };

  return { aiStatus, promptAI };
};

interface TeamPageProps {
  params: { id: string };
}

// ... other interfaces

export default function TeamPage({ params }: TeamPageProps) {
  const router = useRouter();
  const { id: teamId } = useParams();
  const supabase = createClient();
  
  const [team, setTeam] = useState<ITeam | null>(null);
  const [userProfile, setUserProfile] = useState<IProfile | null>(null);
  const [teamMembers, setTeamMembers] = useState<(ITeamMember & { profiles: IProfile })[]>([]);
  const [sessions, setSessions] = useState<IResearchSession[]>([]);
  const [teamMessages, setTeamMessages] = useState<TeamMessageWithProfile[]>([]);
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'members' | 'chat' | 'ai' | 'analytics' | 'settings'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'moderator' | 'member' | null>(null);
  const [realTimeEvents, setRealTimeEvents] = useState<RealTimeEvent[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [inviteModal, setInviteModal] = useState<InviteModalState>({ isOpen: false, email: '', role: 'member', isLoading: false });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [managementAction, setManagementAction] = useState<ManagementAction | null>(null);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [editedTeam, setEditedTeam] = useState({ name: '', description: '', visibility: 'private' as 'private' | 'public' });
  const { aiStatus, promptAI } = useAIService();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const aiChatContainerRef = useRef<HTMLDivElement>(null);

  // ... all other functions from the original file

  return (
    <Layout>
      <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
        {/* ... header ... */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200/60 dark:border-gray-700/60 p-6 shadow-sm">
          {/* ... header content ... */}
        </div>

        <div className="flex-1 p-6 overflow-auto">
          {/* ... tab content ... */}
        </div>

        {/* ... modals ... */}
      </div>
    </Layout>
  );
}
