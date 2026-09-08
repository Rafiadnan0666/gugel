"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { billingService } from "@/lib/billing";
import {
  FiDollarSign,
  FiUsers,
  FiFileText,
  FiTrendingUp,
  FiCalendar,
  FiDownload,
} from "react-icons/fi";
import Layout from "@/components/Layout";

export default function AdminBillingPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadBillingStats();
  }, []);

  const loadBillingStats = async () => {
    try {
      setStats({
        totalRevenue: 15234.5,
        monthlyRevenue: 3421.2,
        activeSubscriptions: 234,
        newCustomers: 18,
        churnRate: 3.2,
        averageRevenuePerUser: 14.61,
      });
    } catch (error) {
      console.error("Error loading billing stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Layout>
  <div>
    
    </div>      
    </Layout>
  );
}
