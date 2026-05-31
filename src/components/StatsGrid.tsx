/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BarChart, CheckCircle2, AlertCircle, FileText, PieChart, Users, ChevronUp } from 'lucide-react';
import { Report, Team, UserProfile } from '../types';

interface StatsGridProps {
  reports: Report[];
  teams: Team[];
  allUsers?: UserProfile[];
}

export default function StatsGrid({ reports, teams, allUsers }: StatsGridProps) {
  // 1. Total reports submitted
  const total = reports.length;

  // 2. State metrics
  const approved = reports.filter((r) => r.status === 'approved').length;
  const rejected = reports.filter((r) => r.status === 'rejected').length;
  const pending = reports.filter((r) => r.status === 'pending').length;

  // 3. Approval rate
  const approvalRate = total > 0 ? Math.round((approved / (approved + rejected || 1)) * 100) : 100;

  // 4. Missing reports today
  // Get today's local date string format YYYY-MM-DD in Vietnam localized time safely
  const getTodayDateString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localNow = new Date(now.getTime() - (offset * 60 * 1000));
    return localNow.toISOString().split('T')[0];
  };
  const todayStr = getTodayDateString();
  const reportsToday = reports.filter((r) => r.date === todayStr).length;

  // Filter actual registered student accounts
  const studentsList = allUsers ? allUsers.filter((u) => u.role === 'student') : [];
  const totalStudentsExpected = studentsList.length > 0 ? studentsList.length : 40;

  // Check unique student UIDs who submitted today to calculate real-time missing count
  const uidsSubmittedToday = new Set(
    reports.filter((r) => r.date === todayStr).map((r) => r.userId)
  );

  const missingReportsToday = studentsList.length > 0
    ? studentsList.filter((student) => !uidsSubmittedToday.has(student.uid)).length
    : Math.max(0, totalStudentsExpected - reportsToday);

  // 5. Build "reports by team" statistics
  const teamStatsMap: { [teamId: string]: { teamName: string; count: number; approved: number } } = {};
  
  // Hydrate with all teams
  teams.forEach((t) => {
    teamStatsMap[t.id] = { teamName: t.name, count: 0, approved: 0 };
  });

  // Count reports
  reports.forEach((r) => {
    if (teamStatsMap[r.teamId]) {
      teamStatsMap[r.teamId].count += 1;
      if (r.status === 'approved') {
        teamStatsMap[r.teamId].approved += 1;
      }
    } else {
      // Stub for any orphaned reports
      teamStatsMap[r.teamId] = { teamName: r.teamName || `Nhóm [${r.teamId}]`, count: 1, approved: r.status === 'approved' ? 1 : 0 };
    }
  });

  const teamStatsArr = Object.entries(teamStatsMap).map(([id, val]) => ({
    id,
    ...val,
  }));

  // Max count for chart scaling
  const maxCount = Math.max(...teamStatsArr.map((t) => t.count), 1);

  return (
    <div className="space-y-6">
      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Card 1: Total Submitted */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-4 transition-all">
          <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-xl text-sky-600 dark:text-sky-400">
            <FileText className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Tổng Báo Cáo Đã Nộp</p>
            <h3 className="text-3xl font-black mt-1 text-slate-800 dark:text-white">{total}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold inline-flex items-center">
                <ChevronUp className="h-3 w-3" />
                Tất cả các tuần
              </span>
              <span>trên {teams.length} nhóm</span>
            </p>
          </div>
        </div>

        {/* Card 2: Approval Rate */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-4 transition-all">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Tỷ Lệ Phê Duyệt</p>
            <h3 className="text-3xl font-black mt-1 text-slate-800 dark:text-white">{approvalRate}%</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              <span>{approved} Đã duyệt / {rejected} Yêu cầu chỉnh sửa</span>
            </p>
          </div>
        </div>

        {/* Card 3: Pending Review */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-4 transition-all">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Báo Cáo Chờ Duyệt</p>
            <h3 className="text-3xl font-black mt-1 text-slate-800 dark:text-white">{pending}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              <span>Cần giáo viên/reviewer xử lý sớm</span>
            </p>
          </div>
        </div>

        {/* Card 4: Missing Reports Today */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-4 transition-all">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-400">
            <Users className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Báo Cáo Thiếu Hôm Nay</p>
            <h3 className="text-3xl font-black mt-1 text-slate-800 dark:text-white">{missingReportsToday}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              <span>Dự kiến: {totalStudentsExpected} / Đã nộp hôm nay: {reportsToday}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Charts Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports by Team Custom SVG Bar Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="text-md font-bold dark:text-white">Tốc độ & Trạng thái nộp Báo cáo theo Nhóm</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-none mt-1">So sánh tổng dung lượng báo cáo đã hoàn thành</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-sky-500 font-semibold">
                <span className="h-2 w-2 rounded-full bg-sky-500 inline-block"></span>
                Tổng nộp
              </span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span>
                Đã duyệt
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {teamStatsArr.map((team) => {
              const totalPct = (team.count / maxCount) * 100;
              const approvedPct = team.count > 0 ? (team.approved / team.count) * 100 : 0;
              return (
                <div key={team.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="truncate text-slate-700 dark:text-gray-300 max-w-[200px]">{team.teamName}</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      <b className="text-slate-800 dark:text-white font-semibold">{team.count}</b> lượt nộp ({team.approved} đã duyệt)
                    </span>
                  </div>
                  {/* Gauge Bar Track */}
                  <div className="h-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative shadow-inner">
                    <div 
                      style={{ width: `${Math.max(4, totalPct)}%` }} 
                      className="absolute inset-y-0 left-0 bg-sky-450/80 dark:bg-sky-500/80 rounded-full transition-all duration-500 ease-out"
                    >
                      {/* Approved overlay inside total */}
                      {team.count > 0 && (
                        <div 
                          style={{ width: `${approvedPct}%` }} 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out shadow-sm"
                        ></div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {teamStatsArr.length === 0 && (
              <div className="h-48 flex items-center justify-center text-sm text-gray-400">
                Không tìm thấy thông tin nhóm nào
              </div>
            )}
          </div>
        </div>

        {/* Report Distribution Custom Doughnut Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-md font-bold dark:text-white">Tỷ lệ tương phản Phê duyệt</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-none mt-1">Biểu đồ cơ cấu tỉ lệ</p>
          </div>

          {/* Custom SVG Circular Graphic */}
          <div className="flex justify-center items-center my-6">
            {total > 0 ? (
              <div className="relative h-44 w-44">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Outer circle tract */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f3f4f6" strokeWidth="3" className="dark:stroke-gray-700" />
                  
                  {/* Pending arc */}
                  <circle 
                    cx="18" cy="18" r="15.915" 
                    fill="none" 
                    stroke="#f59e0b" 
                    strokeWidth="3.5" 
                    strokeDasharray={`${(pending / total) * 100} ${100 - (pending / total) * 100}`} 
                    strokeDashoffset="0"
                    className="transition-all duration-500"
                  />
                  
                  {/* Approved arc */}
                  <circle 
                    cx="18" cy="18" r="15.915" 
                    fill="none" 
                    stroke="#10b981" 
                    strokeWidth="3.5" 
                    strokeDasharray={`${(approved / total) * 100} ${100 - (approved / total) * 100}`} 
                    strokeDashoffset={`-${(pending / total) * 100}`}
                    className="transition-all duration-500"
                  />

                  {/* Rejected arc */}
                  <circle 
                    cx="18" cy="18" r="15.915" 
                    fill="none" 
                    stroke="#ef4444" 
                    strokeWidth="3.5" 
                    strokeDasharray={`${(rejected / total) * 100} ${100 - (rejected / total) * 100}`} 
                    strokeDashoffset={`-${((pending + approved) / total) * 100}`}
                    className="transition-all duration-500"
                  />
                </svg>

                {/* Legend Center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black dark:text-white">{total}</span>
                  <span className="text-xs text-gray-400 font-medium">Báo cáo</span>
                </div>
              </div>
            ) : (
              <div className="h-44 w-44 rounded-full border-4 border-dashed border-gray-100 dark:border-gray-800 flex items-center justify-center text-xs text-gray-400">
                Trống dữ liệu
              </div>
            )}
          </div>

          <div className="space-y-2 mt-2">
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-2 text-slate-600 dark:text-gray-300">
                <span className="h-3 w-3 rounded bg-amber-500 block"></span>
                <span>Chờ duyệt</span>
              </span>
              <span className="font-bold dark:text-white">{pending} ({total > 0 ? Math.round((pending / total) * 100) : 0}%)</span>
            </div>
            
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-2 text-slate-600 dark:text-gray-300">
                <span className="h-3 w-3 rounded bg-emerald-500 block"></span>
                <span>Đã duyệt</span>
              </span>
              <span className="font-bold dark:text-white">{approved} ({total > 0 ? Math.round((approved / total) * 100) : 0}%)</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-2 text-slate-600 dark:text-gray-300">
                <span className="h-3 w-3 rounded bg-red-500 block"></span>
                <span>Bị từ chối</span>
              </span>
              <span className="font-bold dark:text-white">{rejected} ({total > 0 ? Math.round((rejected / total) * 100) : 0}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
