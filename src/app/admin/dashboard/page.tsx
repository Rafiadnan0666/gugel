"use client";
import React from 'react';
import Link from 'next/link';
import { 
  FiUsers, 
  FiDollarSign, 
  FiArchive, 
  FiCpu, 
  FiActivity, 
  FiTrendingUp,
  FiBarChart2,
  FiSettings 
} from 'react-icons/fi';

const adminSections = [
  {
    title: 'User Management',
    description: 'Manage users, roles, devices, and credits',
    icon: <FiUsers className="text-2xl" />,
    color: 'bg-blue-500',
    href: '/admin/users',
    stats: { label: 'Total Users', value: '2,847' },
    subItems: [
      { label: 'All Users', href: '/admin/users' },
      { label: 'User Roles', href: '/admin/users/roles' },
      { label: 'User Devices', href: '/admin/users/devices' },
      { label: 'User Credits', href: '/admin/users/credits' },
    ]
  },
  {
    title: 'Billing & Payments',
    description: 'Handle invoices, payments, and credit management',
    icon: <FiDollarSign className="text-2xl" />,
    color: 'bg-green-500',
    href: '/admin/billing',
    stats: { label: 'Monthly Revenue', value: '$12,459' },
    subItems: [
      { label: 'Invoices', href: '/admin/billing/invoices' },
      { label: 'Payments', href: '/admin/billing/payments' },
      { label: 'Payment Gateways', href: '/admin/billing/gateways' },
      { label: 'Credit Ledger', href: '/admin/billing/credit-ledger' },
    ]
  },
  {
    title: 'Collaboration',
    description: 'Monitor teams, research sessions, and collaboration',
    icon: <FiUsers className="text-2xl" />,
    color: 'bg-purple-500',
    href: '/admin/collaboration',
    stats: { label: 'Active Sessions', value: '1,234' },
    subItems: [
      { label: 'Team Members', href: '/admin/collaboration/team-members' },
      { label: 'Team Messages', href: '/admin/collaboration/team-messages' },
      { label: 'Research Sessions', href: '/admin/collaboration/research-sessions' },
      { label: 'Session Collaborators', href: '/admin/collaboration/session-collaborators' },
    ]
  },
  {
    title: 'Content Management',
    description: 'Manage tabs, summaries, and session content',
    icon: <FiArchive className="text-2xl" />,
    color: 'bg-yellow-500',
    href: '/admin/content',
    stats: { label: 'Total Tabs', value: '45,678' },
    subItems: [
      { label: 'Tabs', href: '/admin/content/tabs' },
      { label: 'Summaries', href: '/admin/content/summaries' },
      { label: 'Session Messages', href: '/admin/content/session-messages' },
    ]
  },
  {
    title: 'AI Management',
    description: 'Configure AI providers, models, and monitor usage',
    icon: <FiCpu className="text-2xl" />,
    color: 'bg-red-500',
    href: '/admin/ai-management',
    stats: { label: 'AI Requests Today', value: '8,901' },
    subItems: [
      { label: 'AI Providers', href: '/admin/ai-providers' },
      { label: 'AI Models', href: '/admin/ai-models' },
      { label: 'AI Prompts', href: '/admin/ai-prompts' },
      { label: 'AI Responses', href: '/admin/ai-responses' },
      { label: 'AI Feedback', href: '/admin/ai-feedback' },
      { label: 'AI Usage Logs', href: '/admin/ai-usage' },
      { label: 'AI Quotas', href: '/admin/ai-quotas' },
    ]
  },
  {
    title: 'System & Audit',
    description: 'System monitoring and administrative actions',
    icon: <FiActivity className="text-2xl" />,
    color: 'bg-gray-500',
    href: '/admin/system',
    stats: { label: 'Actions Today', value: '156' },
    subItems: [
      { label: 'Admin Actions', href: '/admin/audit-log' },
    ]
  }
];

export default function AdminDashboard() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome to the admin panel. Manage and monitor all aspects of the platform.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Users', value: '2,847', change: '+12%', trend: 'up', icon: <FiUsers /> },
          { label: 'Active Sessions', value: '1,234', change: '+8%', trend: 'up', icon: <FiArchive /> },
          { label: 'AI Requests Today', value: '8,901', change: '+23%', trend: 'up', icon: <FiCpu /> },
          { label: 'Monthly Revenue', value: '$12,459', change: '+15%', trend: 'up', icon: <FiDollarSign /> },
        ].map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {stat.label}
              </p>
              <div className="text-gray-400 dark:text-gray-500">
                {stat.icon}
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {stat.value}
            </p>
            <p className={`text-sm mt-2 flex items-center ${
              stat.trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              <FiTrendingUp className="mr-1" />
              {stat.change} from last month
            </p>
          </div>
        ))}
      </div>

      {/* Admin Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminSections.map((section, index) => (
          <Link
            key={index}
            href={section.href}
            className="group bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-lg text-white ${section.color}`}>
                {section.icon}
              </div>
              <FiBarChart2 className="text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {section.title}
            </h3>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {section.description}
            </p>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {section.stats.label}
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {section.stats.value}
                </span>
              </div>
              
              <div className="space-y-1">
                {section.subItems.slice(0, 2).map((item, itemIndex) => (
                  <Link
                    key={itemIndex}
                    href={item.href}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline block"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.label}
                  </Link>
                ))}
                {section.subItems.length > 2 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    +{section.subItems.length - 2} more
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent System Activity
        </h3>
        <div className="space-y-3">
          {[
            { action: 'New user registered', user: 'john@example.com', time: '2 minutes ago', type: 'success' },
            { action: 'AI model updated', user: 'admin@system.com', time: '15 minutes ago', type: 'info' },
            { action: 'Payment processed', user: 'payment@system.com', time: '1 hour ago', type: 'success' },
            { action: 'User role modified', user: 'admin@system.com', time: '2 hours ago', type: 'warning' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-3 ${
                  activity.type === 'success' ? 'bg-green-500' :
                  activity.type === 'warning' ? 'bg-yellow-500' :
                  activity.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                }`} />
                <span className="text-sm text-gray-900 dark:text-white">
                  {activity.action}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  by {activity.user}
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {activity.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}