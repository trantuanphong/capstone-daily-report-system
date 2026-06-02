/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  BarChart2, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Users, 
  XCircle, 
  Clock, 
  Smile, 
  Calendar,
  Layers
} from 'lucide-react';
import { Report, Team, UserProfile } from '../types';

interface StatsGridProps {
  reports: Report[];
  teams: Team[];
  allUsers?: UserProfile[];
}

export default function StatsGrid({ reports, teams, allUsers }: StatsGridProps) {
  const [activeSegment, setActiveSegment] = useState<'today' | 'accumulated'>('today');

  // get today's date in Ho Chi Minh timezone
  const getTodayDateString = () => {
    try {
      const now = new Date();
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(now);
    } catch (e) {
      const d = new Date();
      return d.toISOString().split('T')[0];
    }
  };

  const todayStr = getTodayDateString();

  // All student profiles
  const studentsList = allUsers ? allUsers.filter((u) => u.role === 'student') : [];
  const totalStudentsExpected = studentsList.length;

  // Active teams map for display
  const teamsMap = teams.reduce((acc, t) => {
    acc[t.id] = t.name;
    return acc;
  }, {} as Record<string, string>);

  // ==================== TODAY STATS DATA ====================
  const reportsToday = reports.filter((r) => r.date === todayStr);
  const totalSubmittedToday = reportsToday.length;

  // Group submitted today
  const approvedToday = reportsToday.filter((r) => r.status === 'approved').length;
  const pendingToday = reportsToday.filter((r) => r.status === 'pending').length;
  const rejectedToday = reportsToday.filter((r) => r.status === 'rejected').length;

  // List of students who submitted today
  const submittedStudents = studentsList.filter((s) => 
    reportsToday.some((r) => r.userId === s.uid)
  );

  // List of students who are missing today's report
  const missingStudents = studentsList.filter((s) => 
    !reportsToday.some((r) => r.userId === s.uid)
  );

  const todayCompletionRate = totalStudentsExpected > 0 
    ? Math.round((submittedStudents.length / totalStudentsExpected) * 100) 
    : 0;

  // ==================== ACCUMULATED DATA ====================
  const totalAccumulated = reports.length;
  const approvedAccumulated = reports.filter((r) => r.status === 'approved').length;
  const rejectedAccumulated = reports.filter((r) => r.status === 'rejected').length;
  const pendingAccumulated = reports.filter((r) => r.status === 'pending').length;
  const approvalRateAccumulated = totalAccumulated > 0 
    ? Math.round((approvedAccumulated / (approvedAccumulated + rejectedAccumulated || 1)) * 100) 
    : 100;

  // Build "reports by team" statistics (Accumulated)
  const teamStatsMap: { [teamId: string]: { teamName: string; count: number; approved: number } } = {};
  
  teams.forEach((t) => {
    teamStatsMap[t.id] = { teamName: t.name, count: 0, approved: 0 };
  });

  reports.forEach((r) => {
    if (teamStatsMap[r.teamId]) {
      teamStatsMap[r.teamId].count += 1;
      if (r.status === 'approved') {
        teamStatsMap[r.teamId].approved += 1;
      }
    } else {
      teamStatsMap[r.teamId] = { 
        teamName: r.teamName || `Nhóm [${r.teamId}]`, 
        count: 1, 
        approved: r.status === 'approved' ? 1 : 0 
      };
    }
  });

  const teamStatsArr = Object.entries(teamStatsMap).map(([id, val]) => ({
    id,
    ...val,
  }));
  const maxCount = Math.max(...teamStatsArr.map((t) => t.count), 1);

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Segment switcher */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 pb-px">
        <button
          id="btn-stats-today-tab"
          onClick={() => setActiveSegment('today')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeSegment === 'today'
              ? 'border-sky-500 text-sky-500 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Thống kê Ngày Hôm Nay ({todayStr})</span>
        </button>
        <button
          id="btn-stats-all-tab"
          onClick={() => setActiveSegment('accumulated')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeSegment === 'accumulated'
              ? 'border-sky-500 text-sky-500 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Lũy Kế Toàn Bộ Thời Gian</span>
        </button>
      </div>

      {activeSegment === 'today' ? (
        /* TODAY STATISTICS VIEW */
        <div className="space-y-8 animate-fade-in">
          {/* Today's Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Card 1: Today's Completion */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-4 transition-all">
              <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-xl text-sky-600 dark:text-sky-400">
                <Users className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Tỷ Lệ Nộp Báo Cáo</p>
                <h3 className="text-3xl font-black mt-1 text-slate-800 dark:text-white">
                  {todayCompletionRate}%
                </h3>
                <p className="text-xs text-slate-550 dark:text-gray-400 mt-1.5 font-medium">
                  Đã nộp: <b>{submittedStudents.length}</b> / {totalStudentsExpected} sinh viên
                </p>
              </div>
            </div>

            {/* Card 2: Today's Approved */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-4 transition-all">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Đã Phê Duyệt</p>
                <h3 className="text-3xl font-black mt-1 text-slate-800 dark:text-white">{approvedToday}</h3>
                <p className="text-xs text-emerald-650 mt-1.5 font-semibold">
                  Báo cáo hoàn thành xuất sắc
                </p>
              </div>
            </div>

            {/* Card 3: Today's Pending */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-4 transition-all">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Đang Chờ Duyệt</p>
                <h3 className="text-3xl font-black mt-1 text-slate-800 dark:text-white">{pendingToday}</h3>
                <p className="text-xs text-amber-650 mt-1.5 font-bold">
                  Cần được reviewer duyệt hôm nay
                </p>
              </div>
            </div>

            {/* Card 4: Today's Rejected / Need fix */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-4 transition-all">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-400">
                <XCircle className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Yêu Cầu Chỉnh Sửa</p>
                <h3 className="text-3xl font-black mt-1 text-slate-800 dark:text-white">{rejectedToday}</h3>
                <p className="text-xs text-rose-650 mt-1.5 font-semibold">
                  Yêu cầu cập nhật từ giáo viên
                </p>
              </div>
            </div>
          </div>

          {/* Today's Distribution Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Missing list */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-[520px]">
              <div className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4 shrink-0">
                <h4 className="font-bold text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <XCircle className="h-4 w-4" />
                  <span>Sinh viên chưa nộp báo cáo hôm nay ({missingStudents.length})</span>
                </h4>
                <p className="text-[11px] text-gray-400 mt-1 leading-none">Danh sách sinh viên khuyết điểm thiếu tiến độ ngày {todayStr}</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {missingStudents.map((stud) => (
                  <div 
                    key={stud.uid}
                    className="p-3 rounded-xl bg-rose-50/20 dark:bg-rose-955/5 border border-rose-100/40 dark:border-rose-950/40 flex items-center justify-between"
                  >
                    <div>
                      <h5 className="font-bold text-xs text-slate-800 dark:text-white leading-tight">{stud.name}</h5>
                      <p className="text-[10px] text-gray-400 mt-1 font-mono">{stud.email}</p>
                    </div>
                    <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded font-black dark:border bg-rose-50/50 dark:bg-rose-950 text-rose-600 dark:text-rose-455 border-rose-200">
                      THIẾU BÁO CÁO
                    </span>
                  </div>
                ))}

                {missingStudents.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20 text-gray-400 dark:text-gray-500">
                    <Smile className="h-10 w-10 text-emerald-500 mb-2 animate-bounce" />
                    <p className="text-xs font-bold text-slate-700 dark:text-gray-350">Tuyệt vời! 100% sinh viên đã nộp báo cáo.</p>
                    <p className="text-[10px] text-gray-400 mt-1">Sĩ số hoàn thành xuất sắc ngày hôm nay.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Submitted list */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-[520px]">
              <div className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4 shrink-0">
                <h4 className="font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Sinh viên đã báo cáo hôm nay ({submittedStudents.length})</span>
                </h4>
                <p className="text-[11px] text-gray-400 mt-1 leading-none">Danh sách tiến độ đã đăng ký phục vụ kết xuất kiểm tra</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {submittedStudents.map((stud) => {
                  const rep = reportsToday.find((r) => r.userId === stud.uid);
                  if (!rep) return null;

                  return (
                    <div 
                      key={stud.uid}
                      className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700 space-y-2 hover:border-sky-150 transition-all"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h5 className="font-bold text-xs text-slate-800 dark:text-white leading-tight">{stud.name}</h5>
                          <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold uppercase mt-0.5 block">
                            Nhóm: {teamsMap[stud.teamId] || stud.teamId || 'Chưa chia'}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase ${
                          rep.status === 'approved' 
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                            : rep.status === 'rejected' 
                              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400' 
                              : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                        }`}>
                          {rep.status === 'approved' ? 'Đã duyệt' : rep.status === 'rejected' ? 'Yêu cầu sửa' : 'Đang duyệt'}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed font-sans line-clamp-2">
                        {rep.isRestDay ? (
                          <span className="italic text-amber-600 dark:text-amber-400 font-semibold">[Xin nghỉ phép] Lý do: {rep.restReason}</span>
                        ) : (
                          <><b>Công việc:</b> {rep.todayWork}</>
                        )}
                      </div>
                    </div>
                  );
                })}

                {submittedStudents.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20 text-gray-400">
                    <Clock className="h-10 w-10 text-slate-300 mb-2 animate-pulse" />
                    <p className="text-xs font-semibold">Chưa có sinh viên nào đi nộp báo cáo.</p>
                    <p className="text-[10px] text-gray-400 mt-1">Đang chờ cổng thời gian ghi nhận.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ACCUMULATED ALL-TIME STATISTICS VIEW */
        <div className="space-y-8 animate-fade-in">
          {/* Accumulated Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Card 1: Total Submitted */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-4 transition-all">
              <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-xl text-sky-600 dark:text-sky-400">
                <FileText className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tổng Báo Cáo Đã Nộp</p>
                <h3 className="text-3xl font-black mt-1 text-slate-800 dark:text-white">{totalAccumulated}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">
                  Tích lũy từ tất cả các tuần qua
                </p>
              </div>
            </div>

            {/* Card 2: Approval Rate */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-4 transition-all">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tỷ Lệ Phê Duyệt Lũy Kế</p>
                <h3 className="text-3xl font-black mt-1 text-slate-800 dark:text-white">{approvalRateAccumulated}%</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 truncate">
                  {approvedAccumulated} Đã duyệt / {rejectedAccumulated} Yêu cầu sửa
                </p>
              </div>
            </div>

            {/* Card 3: Pending Review */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-4 transition-all">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Báo Cáo Chờ Duyệt (Lũy kế)</p>
                <h3 className="text-3xl font-black mt-1 text-slate-800 dark:text-white">{pendingAccumulated}</h3>
                <p className="text-xs text-slate-550 dark:text-gray-400 mt-1.5">
                  Xét duyệt cần reviewer xử lý
                </p>
              </div>
            </div>

            {/* Card 4: Total Expected students */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-4 transition-all">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-purple-600 dark:text-purple-400">
                <Users className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Sĩ Số Đồ Án Tổng</p>
                <h3 className="text-3xl font-black mt-1 text-slate-800 dark:text-white">{totalStudentsExpected}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  Tổng sinh viên đăng ký hệ thống
                </p>
              </div>
            </div>
          </div>

          {/* Charts Bento Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Reports by Team Custom SVG Bar Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-md font-bold dark:text-white">Báo cáo theo Nhóm Đồ án (Lũy kế)</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">So sánh số lượt báo cáo nộp thành công</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center gap-1 text-xs text-sky-500 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-sky-500 inline-block"></span>
                    Tổng nộp
                  </span>
                  <span className="flex items-center gap-1 text-xs text-emerald-500 font-semibold">
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
                          <b className="text-slate-800 dark:text-white font-semibold">{team.count}</b> nộp ({team.approved} Approved)
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
                    Chưa đăng ký nhóm đồ án nào trên hệ thống
                  </div>
                )}
              </div>
            </div>

            {/* Circular Rate donut chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-md font-bold dark:text-white">Tương phản xét duyệt (Lũy kế)</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Biểu đồ tỉ lệ phân phối</p>
              </div>

              {/* Custom SVG Circular Graphic */}
              <div className="flex justify-center items-center my-6">
                {totalAccumulated > 0 ? (
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
                        strokeDasharray={`${(pendingAccumulated / totalAccumulated) * 100} ${100 - (pendingAccumulated / totalAccumulated) * 100}`} 
                        strokeDashoffset="0"
                        className="transition-all duration-500"
                      />
                      
                      {/* Approved arc */}
                      <circle 
                        cx="18" cy="18" r="15.915" 
                        fill="none" 
                        stroke="#10b981" 
                        strokeWidth="3.5" 
                        strokeDasharray={`${(approvedAccumulated / totalAccumulated) * 100} ${100 - (approvedAccumulated / totalAccumulated) * 100}`} 
                        strokeDashoffset={`-${(pendingAccumulated / totalAccumulated) * 100}`}
                        className="transition-all duration-500"
                      />

                      {/* Rejected arc */}
                      <circle 
                        cx="18" cy="18" r="15.915" 
                        fill="none" 
                        stroke="#ef4444" 
                        strokeWidth="3.5" 
                        strokeDasharray={`${(rejectedAccumulated / totalAccumulated) * 100} ${100 - (rejectedAccumulated / totalAccumulated) * 100}`} 
                        strokeDashoffset={`-${((pendingAccumulated + approvedAccumulated) / totalAccumulated) * 100}`}
                        className="transition-all duration-500"
                      />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black dark:text-white">{totalAccumulated}</span>
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
                  <span className="font-bold dark:text-white">
                    {pendingAccumulated} ({totalAccumulated > 0 ? Math.round((pendingAccumulated / totalAccumulated) * 100) : 0}%)
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-gray-300">
                    <span className="h-3 w-3 rounded bg-emerald-500 block"></span>
                    <span>Đã duyệt</span>
                  </span>
                  <span className="font-bold dark:text-white">
                    {approvedAccumulated} ({totalAccumulated > 0 ? Math.round((approvedAccumulated / totalAccumulated) * 100) : 0}%)
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-gray-300">
                    <span className="h-3 w-3 rounded bg-red-500 block"></span>
                    <span>Yêu cầu sửa</span>
                  </span>
                  <span className="font-bold dark:text-white">
                    {rejectedAccumulated} ({totalAccumulated > 0 ? Math.round((rejectedAccumulated / totalAccumulated) * 100) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
