/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileText } from 'lucide-react';
import { Report, UserProfile } from '../types';
import ReportForm from './ReportForm';

interface StudentDashboardProps {
  userProfile: UserProfile;
  reports: Report[];
  sysStartTime: string;
  sysEndTime: string;
  isWithinTimeRange: boolean;
  onSubmitReport: (reportData: {
    id?: string;
    date: string;
    todayWork: string;
    blockers: string;
    tomorrowPlan: string;
    isRestDay?: boolean;
    restReason?: string;
  }) => Promise<void>;
}

export default function StudentDashboard({
  userProfile,
  reports,
  sysStartTime,
  sysEndTime,
  isWithinTimeRange,
  onSubmitReport,
}: StudentDashboardProps) {
  const studentReports = reports.filter((r) => r.userId === userProfile.uid);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Submit Form Column */}
        <div className="lg:col-span-2 space-y-6">
          <ReportForm 
            userProfile={userProfile} 
            existingReports={reports} 
            startTime={sysStartTime}
            endTime={sysEndTime}
            isWithinTimeRange={isWithinTimeRange}
            onSubmit={onSubmitReport} 
          />
        </div>

        {/* Historic list Column */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm font-sans">
            <h4 className="font-bold text-md text-slate-800 dark:text-white mb-4 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-sky-500" />
              <span>Lịch sử báo cáo cá nhân</span>
            </h4>

            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {studentReports.map((r) => (
                <div 
                  key={r.id} 
                  className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs transition-hover hover:bg-slate-50 dark:hover:bg-gray-800/20"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-slate-800 dark:text-white">{r.date}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[150px]">
                      {r.isRestDay ? `Nghỉ phép: ${r.restReason}` : r.todayWork}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase shrink-0 ${
                    r.status === 'approved' 
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                      : r.status === 'rejected' 
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400' 
                        : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                  }`}>
                    {r.status === 'approved' ? 'Đã duyệt' : r.status === 'rejected' ? 'Trả về' : 'Đang duyệt'}
                  </span>
                </div>
              ))}

              {studentReports.length === 0 && (
                <p className="text-gray-400 dark:text-gray-500 text-xs italic text-center py-6">Chưa có dữ liệu báo cáo nào được ghi nhận.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
