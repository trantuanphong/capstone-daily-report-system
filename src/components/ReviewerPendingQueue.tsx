/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { CheckSquare, Calendar, Layers } from 'lucide-react';
import { Report, UserProfile } from '../types';
import ReportCard from './ReportCard';

interface ReviewerPendingQueueProps {
  reports: Report[];
  userProfile: UserProfile;
  teamNameString: string;
  onReview: (reportId: string, status: 'approved' | 'rejected', comment: string) => Promise<void>;
}

export default function ReviewerPendingQueue({ reports, userProfile, teamNameString, onReview }: ReviewerPendingQueueProps) {
  const [filterScope, setFilterScope] = useState<'today' | 'all'>('today');

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

  const allPendingReports = reports.filter((r) => r.status === 'pending');
  const todayPendingReports = allPendingReports.filter((r) => r.date === todayStr);

  const displayedReports = filterScope === 'today' ? todayPendingReports : allPendingReports;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-sky-500" />
            <span>Phê duyệt Báo cáo Tiến độ</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Danh sách báo cáo hàng ngày của nhóm {teamNameString}. Vui lòng đánh giá và gửi phản hồi kịp thời.
          </p>
        </div>

        {/* Filter Segment Controllers */}
        <div className="inline-flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl self-start sm:self-center">
          <button
            onClick={() => setFilterScope('today')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer outline-none ${
              filterScope === 'today'
                ? 'bg-white dark:bg-gray-700 text-sky-600 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Hôm nay chưa duyệt ({todayPendingReports.length})</span>
          </button>
          <button
            onClick={() => setFilterScope('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer outline-none ${
              filterScope === 'all'
                ? 'bg-white dark:bg-gray-700 text-sky-600 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Tất cả chưa duyệt ({allPendingReports.length})</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayedReports.map((report) => (
          <ReportCard 
            key={report.id} 
            report={report} 
            userRole={userProfile.role} 
            userTeamId={userProfile.teamId} 
            onReview={onReview}
          />
        ))}

        {displayedReports.length === 0 && (
          <div className="col-span-1 md:col-span-2 py-16 text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-sm">
            {filterScope === 'today' ? (
              <div>
                <p className="font-medium text-slate-700 dark:text-gray-300">Không có báo cáo nào nộp ngày hôm nay ({todayStr}) đang chờ duyệt!</p>
                {allPendingReports.length > 0 && (
                  <button 
                    onClick={() => setFilterScope('all')}
                    className="mt-3 text-sky-600 hover:text-sky-700 font-semibold text-xs transition-all cursor-pointer outline-none underline"
                  >
                    Xem tất cả {allPendingReports.length} báo cáo chưa duyệt từ các ngày trước
                  </button>
                )}
              </div>
            ) : (
              <p className="font-medium text-slate-700 dark:text-gray-300">Tuyệt vời! Hiện không còn báo cáo nào đang chờ phê duyệt.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
