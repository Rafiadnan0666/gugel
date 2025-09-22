'use client';
import { useEffect, useState, useRef, Component } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IResearchSession, ITab, IDraft,ITeam } from '@/types/main.db';
import { 
  FiPlus, FiUsers, FiUser, FiEdit2, FiTrash2, FiMail, FiBell, 
  FiMessageSquare, FiSearch, FiX, FiExternalLink, FiImage,
  FiBarChart2, FiClock, FiBook, FiStar, FiZap, FiCpu, FiChevronRight,
  FiDownload, FiSend, FiPaperclip, FiMoreVertical, FiFilter
} from 'react-icons/fi';
import { jsPDF } from 'jspdf';

export default class teamId extends Component {
    const [state, setstate] = useState();
  render() {
    return (
    <div></div>
    )
  }
}
