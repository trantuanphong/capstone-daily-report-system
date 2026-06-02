/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  Home, 
  Users, 
  FileText, 
  CheckSquare, 
  BarChart2, 
  LogOut, 
  Menu, 
  X, 
  Settings, 
  Calendar,
  Award,
  ShieldAlert,
  FolderLock,
  Mail
} from 'lucide-react';
import { UserProfile } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  userProfile: UserProfile;
  teamName: string;
  onLogout: () => void;
}

export default function Sidebar({ currentTab, setCurrentTab, userProfile, teamName, onLogout }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getTabsByRole = () => {
    switch (userProfile.role) {
      case 'admin':
        return [
          { id: 'stats', label: 'Thống kê Tổng quan', icon: BarChart2 },
          { id: 'admin-member-stats', label: 'Thống kê Thành viên', icon: Award },
          { id: 'admin-users', label: 'Quản lý Người dùng', icon: Users },
          { id: 'admin-teams', label: 'Quản lý Nhóm', icon: Settings },
          { id: 'admin-reports', label: 'Tất cả Báo cáo', icon: FileText },
        ];
      case 'reviewer':
        return [
          { id: 'reviewer-stats', label: 'Thống kê Nhóm', icon: BarChart2 },
          { id: 'reviewer-review', label: 'Báo cáo Chờ duyệt', icon: CheckSquare },
          { id: 'reviewer-team-reports', label: 'Lịch sử Báo cáo Nhóm', icon: FileText },
          { id: 'weekly-summary', label: 'Tổng hợp Báo cáo Tuần', icon: Calendar },
        ];
      case 'student':
      default:
        return [
          { id: 'student-dash', label: 'Báo cáo hàng ngày', icon: Home },
          { id: 'student-teammates', label: 'Báo cáo của Thành viên', icon: Users },
          { id: 'student-notifications', label: 'Hộp thư Thông báo', icon: Mail },
          { id: 'weekly-summary', label: 'Tổng hợp Báo cáo Tuần', icon: Calendar },
        ];
    }
  };

  const tabs = getTabsByRole();

  const getRoleBadgeColor = () => {
    switch (userProfile.role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800';
      case 'reviewer':
        return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800';
      case 'student':
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800';
    }
  };

  const getRoleIcon = () => {
    switch (userProfile.role) {
      case 'admin':
        return <FolderLock className="h-4 w-4" />;
      case 'reviewer':
        return <Award className="h-4 w-4" />;
      case 'student':
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Quản trị viên';
      case 'reviewer': return 'Giáo viên / Reviewer';
      case 'student': return 'Sinh viên';
      default: return role;
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-100 transition-colors">
      {/* Brand Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
          <CheckSquare className="h-6 w-6 text-sky-500" />
          <span>Capstone Report</span>
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hệ thống báo cáo hàng ngày</p>
      </div>

      {/* Profile Section */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20">
        <div className="flex flex-col gap-2">
          {/* Avatar simulation using initials */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-sky-50 flex items-center justify-center text-white font-semibold shadow-sm">
              {(userProfile.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold truncate text-slate-800 dark:text-white">{userProfile.name}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userProfile.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border ${getRoleBadgeColor()}`}>
              {getRoleIcon()}
              <span>{getRoleDisplayName(userProfile.role)}</span>
            </span>
            {userProfile.role !== 'admin' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                Nhóm: {teamName || 'Chưa phân nhóm'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <nav id="nav-tabs" className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-${tab.id}`}
              onClick={() => {
                setCurrentTab(tab.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800/60 dark:hover:text-white'
              }`}
            >
              <IconComponent className={`h-5 w-5 ${isActive ? 'text-sky-500' : 'text-gray-400 dark:text-gray-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout Row */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20">
        <button
          id="btn-sidebar-logout"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 transition-all"
        >
          <LogOut className="h-5 w-5" />
          <span>Đăng Xuất</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Header Row */}
      <header className="lg:hidden h-16 flex items-center justify-between px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-6 w-6 text-sky-500" />
          <span className="font-bold text-lg dark:text-white">Capstone Report</span>
        </div>
        <button
          id="btn-mobile-menu"
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 -mr-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white focus:outline-none"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden animate-fade-in"
        >
          {/* Drawer Panel */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-72 h-full animate-slide-right"
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
