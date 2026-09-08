import React from 'react';
import { requireAdmin } from '@/lib/auth-guard';
import { 
  FiUsers, 
  FiDollarSign, 
  FiUser, 
  FiUsers as FiUsersIcon, 
  FiArchive, 
  FiCpu, 
  FiSettings, 
  FiActivity, 
  FiChevronRight 
} from 'react-icons/fi';

const adminNavItems = [
  {
    section: 'User Management',
    icon: <FiUsers />,
    items: [
      { href: '/admin/users', label: 'All Users', icon: <FiUser /> },
      { href: '/admin/users/roles', label: 'User Roles', icon: <FiUser /> },
      { href: '/admin/users/devices', label: 'User Devices', icon: <FiUser /> },
      { href: '/admin/users/credits', label: 'User Credits', icon: <FiDollarSign /> },
    ]
  },
  {
    section: 'Billing & Payments',
    icon: <FiDollarSign />,
    items: [
      { href: '/admin/billing/invoices', label: 'Invoices', icon: <FiDollarSign /> },
      { href: '/admin/billing/payments', label: 'Payments', icon: <FiDollarSign /> },
      { href: '/admin/billing/gateways', label: 'Payment Gateways', icon: <FiDollarSign /> },
      { href: '/admin/billing/credit-ledger', label: 'Credit Ledger', icon: <FiDollarSign /> },
    ]
  },
  {
    section: 'Collaboration',
    icon: <FiUsersIcon />,
    items: [
      { href: '/admin/collaboration/team-members', label: 'Team Members', icon: <FiUsersIcon /> },
      { href: '/admin/collaboration/team-messages', label: 'Team Messages', icon: <FiUsersIcon /> },
      { href: '/admin/collaboration/research-sessions', label: 'Research Sessions', icon: <FiArchive /> },
      { href: '/admin/collaboration/session-collaborators', label: 'Session Collaborators', icon: <FiUsersIcon /> },
    ]
  },
  {
    section: 'Content Management',
    icon: <FiArchive />,
    items: [
      { href: '/admin/content/tabs', label: 'Tabs', icon: <FiArchive /> },
      { href: '/admin/content/summaries', label: 'Summaries', icon: <FiArchive /> },
      { href: '/admin/content/session-messages', label: 'Session Messages', icon: <FiArchive /> },
    ]
  },
  {
    section: 'AI Management',
    icon: <FiCpu />,
    items: [
      { href: '/admin/ai-providers', label: 'AI Providers', icon: <FiCpu /> },
      { href: '/admin/ai-models', label: 'AI Models', icon: <FiCpu /> },
      { href: '/admin/ai-prompts', label: 'AI Prompts', icon: <FiCpu /> },
      { href: '/admin/ai-responses', label: 'AI Responses', icon: <FiCpu /> },
      { href: '/admin/ai-feedback', label: 'AI Feedback', icon: <FiCpu /> },
      { href: '/admin/ai-usage', label: 'AI Usage Logs', icon: <FiCpu /> },
      { href: '/admin/ai-quotas', label: 'AI Quotas', icon: <FiCpu /> },
    ]
  },
  {
    section: 'System & Audit',
    icon: <FiActivity />,
    items: [
      { href: '/admin/audit-log', label: 'Admin Actions', icon: <FiActivity /> },
    ]
  }
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex">
        <div className="w-64 bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700 min-h-screen">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Admin Panel
            </h2>
            <nav className="space-y-6">
              {adminNavItems.map((section) => (
                <div key={section.section}>
                  <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    {section.icon}
                    <span className="ml-2">{section.section}</span>
                  </div>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <AdminNavLink href={item.href} icon={item.icon} label={item.label} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </div>

        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

function AdminNavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center px-3 py-2 text-sm rounded-md transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      {icon}
      <span className="ml-3">{label}</span>
    </a>
  );
}
