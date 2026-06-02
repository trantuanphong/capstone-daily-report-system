/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAppState } from './hooks/useAppState';
import Sidebar from './components/Sidebar';
import DarkToggle from './components/DarkToggle';
import StatsGrid from './components/StatsGrid';

// Refactored Sub-Views
import StudentDashboard from './components/StudentDashboard';
import TeammatesReportFeed from './components/TeammatesReportFeed';
import ReviewerPendingQueue from './components/ReviewerPendingQueue';
import ReviewerArchive from './components/ReviewerArchive';
import WeeklySummary from './components/WeeklySummary';
import EmailInbox from './components/EmailInbox';
import AdminTeams from './components/AdminTeams';
import AdminUsers from './components/AdminUsers';
import AdminReports from './components/AdminReports';
import AdminMemberStats from './components/AdminMemberStats';

import { 
  CheckSquare, 
  AlertTriangle, 
  RefreshCw,
  Lock
} from 'lucide-react';

export default function App() {
  const {
    currentUser,
    userProfile,
    teams,
    reports,
    allUsers,
    currentTab,
    setCurrentTab,
    loading,
    teamNameMap,
    isPlaceholderConfig,
    sysStartTime,
    sysEndTime,
    sysReminderTime,
    smtpUser,
    smtpPass,
    smtpHost,
    smtpPort,
    notifications,
    gmailConnected,
    authErrorMessage,
    whitelist,
    adminUserEditMessage,
    handleSignIn,
    handleSignOut,
    handleConnectGmail,
    handleSaveReport,
    handleSaveSystemConfig,
    handleSaveEmailConfig,
    handleReviewDecision,
    handleCreateTeam,
    handleUpdateTeam,
    handleDeleteTeam,
    handleSaveUserByAdmin,
    handleAddWhitelist,
    handleDeleteWhitelist,
    isWithinTimeRange,
    hydratedReports
  } = useAppState();

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center font-sans animate-fade-in">
        <div className="flex flex-col items-center gap-4 text-center">
          <RefreshCw className="h-10 w-10 text-sky-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-600 dark:text-gray-400">Đang khởi động hệ thống Báo cáo đồ án Capstone...</p>
        </div>
      </div>
    );
  }

  // Login Screen
  if (!currentUser || !userProfile) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8 rounded-3xl shadow-xl flex flex-col gap-6 text-center animate-fade-in animate-duration-500">
          <div className="mx-auto p-4 bg-sky-50 dark:bg-sky-950/40 rounded-2xl text-sky-500 shadow-inner">
            <CheckSquare className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Báo cáo Đồ án Capstone</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              Cổng thông tin tổng hợp và giám sát tiến độ đồ án tốt nghiệp theo thời gian thực. Đăng nhập bằng tài khoản Google (Gmail giáo dục / whitelist) để hoàn thành báo cáo ngày và xem kết quả phê duyệt.
            </p>
          </div>

          {/* Authorization Whitelist & Google Test Account Error Banner */}
          {authErrorMessage && (
            <div className="p-4 bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-400 text-xs rounded-2xl border border-red-200/50 dark:border-red-900/50 text-left space-y-1.5 animate-fade-in font-medium">
              <div className="flex items-start gap-2.5">
                <Lock className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-red-900 dark:text-red-300">Không Có Quyền Truy Cập</strong>
                  <p className="mt-1 text-[11px] leading-relaxed">
                    {authErrorMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Configuration warning if config is placing default environment parameters */}
          {isPlaceholderConfig && (
            <div className="p-4 bg-amber-50/55 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 text-xs rounded-2xl border border-amber-200/50 dark:border-amber-900/50 text-left space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Chưa cấu hình Firebase</strong>
                  <p className="mt-1 leading-relaxed">
                    Vui lòng thiết lập thông tin cấu hình Firebase thực tế trong tệp `.env` để tiến hành lưu trữ dữ liệu.
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            id="btn-google-login"
            onClick={handleSignIn}
            className="w-full inline-flex items-center justify-center gap-3 px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 font-bold text-sm text-[#444] dark:text-white shadow-sm transition-all focus:ring-2 focus:ring-sky-500 select-none cursor-pointer"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Đăng nhập bằng Google Account
          </button>
        </div>
      </main>
    );
  }

  // RENDER APP
  const teamNameString = teamNameMap[userProfile.teamId] || '';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex flex-col lg:flex-row transition-colors">
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        userProfile={userProfile} 
        teamName={teamNameString} 
        onLogout={handleSignOut} 
      />

      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen">
        <header className="h-16 px-6 lg:px-8 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between sticky top-0 z-10 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-extrabold tracking-wider text-sky-550 font-mono">
              ROLE: {userProfile.role}
            </span>
            {userProfile.teamId && (
              <>
                <span className="text-gray-300">/</span>
                <span className="text-xs text-slate-550 font-semibold truncate max-w-[200px]">
                  Team {teamNameString}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {userProfile.role !== 'student' && (
              <div className="flex items-center mr-1">
                {gmailConnected ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] uppercase font-bold tracking-wider rounded-xl border border-emerald-100 dark:border-emerald-900 select-none">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Tích hợp Gmail: ĐÃ BẬT</span>
                  </div>
                ) : (
                  <button 
                    onClick={handleConnectGmail}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900 border border-amber-200 dark:border-amber-900 text-[10px] uppercase font-bold tracking-wider rounded-xl transition-all cursor-pointer select-none"
                    title="Nhấp để xác thực tài khoản Gmail gửi thông báo tự động"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>Kết nối Gmail</span>
                  </button>
                )}
              </div>
            )}
            <DarkToggle />
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto">
          {/* USER BANNER FOR UNASSIGNED MEMBERS */}
          {userProfile.role !== 'admin' && !userProfile.teamId && (
            <div className="p-5 bg-amber-50 border border-amber-200 dark:bg-amber-955/20 dark:border-amber-905 text-amber-850 dark:text-amber-400 rounded-3xl flex gap-4 animate-fade-in">
              <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Chưa được phân nhóm đồ án</h4>
                <p className="text-xs mt-1.5 leading-relaxed">
                  Hiện bạn chưa được phân khoa hoặc phân nhóm đồ án Capstone nào. Các tiện ích nộp báo cáo tiến trình hàng ngày cùng bảng tiến độ của đồng đội sẽ được mở khóa ngay khi Quản trị viên chỉ định bạn vào một nhóm phù hợp.
                </p>
              </div>
            </div>
          )}

          {/* TAB CONTENT 1: STUDENT DASHBOARD */}
          {currentTab === 'student-dash' && userProfile.role === 'student' && (
            <StudentDashboard 
              userProfile={userProfile}
              reports={hydratedReports}
              sysStartTime={sysStartTime}
              sysEndTime={sysEndTime}
              isWithinTimeRange={isWithinTimeRange}
              onSubmitReport={handleSaveReport}
            />
          )}

          {/* TAB CONTENT 2: TEAMMAP'S REPORTS LOG (STUDENT) */}
          {currentTab === 'student-teammates' && userProfile.role === 'student' && (
            <TeammatesReportFeed 
              reports={hydratedReports}
              userProfile={userProfile}
              teamNameString={teamNameString}
            />
          )}

          {/* TAB CONTENT 3: SIMULATED INBOX LOG (STUDENTS) */}
          {currentTab === 'student-notifications' && (
            <EmailInbox notifications={notifications} />
          )}

          {/* TAB CONTENT 4: REVIEWER PENDING QUEUE */}
          {currentTab === 'reviewer-review' && userProfile.role === 'reviewer' && (
            <ReviewerPendingQueue 
              reports={hydratedReports}
              userProfile={userProfile}
              teamNameString={teamNameString}
              onReview={handleReviewDecision}
            />
          )}

          {/* TAB CONTENT 5: REVIEWER ARCHIVE */}
          {currentTab === 'reviewer-team-reports' && userProfile.role === 'reviewer' && (
            <ReviewerArchive 
              reports={hydratedReports}
              userProfile={userProfile}
              teamNameString={teamNameString}
              onReview={handleReviewDecision}
            />
          )}

          {/* TAB CONTENT 6: STATS & ANALYTICS GRIDS */}
          {(currentTab === 'reviewer-stats' || currentTab === 'stats') && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold dark:text-white">
                  {currentTab === 'stats' ? 'Analytics Insights Master' : 'Thống kê & Giám sát Tiến độ'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Các chỉ số đo lường trạng thái báo cáo tiến trình thời gian thực</p>
              </div>

              <StatsGrid reports={reports} teams={teams} allUsers={allUsers} />
            </div>
          )}

          {/* TAB CONTENT 7: WEEKLY REPORT ACCUMULATIONS */}
          {currentTab === 'weekly-summary' && (
            <WeeklySummary 
              allUsers={allUsers}
              userProfile={userProfile}
              teamNameString={teamNameString}
              reports={hydratedReports}
            />
          )}

          {/* TAB CONTENT 8: ADMIN TEAMS MANAGEMENT */}
          {currentTab === 'admin-teams' && userProfile.role === 'admin' && (
            <AdminTeams 
              teams={teams}
              initialStartTime={sysStartTime}
              initialEndTime={sysEndTime}
              initialReminderTime={sysReminderTime}
              onSaveConfig={handleSaveSystemConfig}
              onCreateTeam={handleCreateTeam}
              onUpdateTeam={handleUpdateTeam}
              onDeleteTeam={handleDeleteTeam}
              smtpUser={smtpUser}
              smtpPass={smtpPass}
              smtpHost={smtpHost}
              smtpPort={smtpPort}
              onSaveEmailConfig={handleSaveEmailConfig}
            />
          )}

          {/* TAB CONTENT 11: ADMIN INDIVIDUAL MEMBER STATISTICS */}
          {currentTab === 'admin-member-stats' && userProfile.role === 'admin' && (
            <AdminMemberStats 
              allUsers={allUsers}
              reports={hydratedReports}
              teams={teams}
              teamNameMap={teamNameMap}
            />
          )}

          {/* TAB CONTENT 9: ADMIN USERS ROLES & AUTH WHITELIST */}
          {currentTab === 'admin-users' && userProfile.role === 'admin' && (
            <AdminUsers 
              allUsers={allUsers}
              teams={teams}
              teamNameMap={teamNameMap}
              adminUserEditMessage={adminUserEditMessage}
              whitelist={whitelist}
              onSaveUserByAdmin={handleSaveUserByAdmin}
              onAddWhitelist={handleAddWhitelist}
              onDeleteWhitelist={handleDeleteWhitelist}
            />
          )}

          {/* TAB CONTENT 10: ADMIN MASTER ARCHIVE LEDGER */}
          {currentTab === 'admin-reports' && userProfile.role === 'admin' && (
            <AdminReports 
              reports={hydratedReports}
              userProfile={userProfile}
              onReview={handleReviewDecision}
            />
          )}
        </main>
      </div>
    </div>
  );
}
