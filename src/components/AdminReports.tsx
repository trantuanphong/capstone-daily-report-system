/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { FileText, Search, RotateCcw, CheckCheck, Loader2 } from 'lucide-react';
import { Report, UserProfile } from '../types';
import ReportCard from './ReportCard';
import CSVExport from './CSVExport';

interface AdminReportsProps {
  reports: Report[];
  userProfile: UserProfile;
  onReview: (reportId: string, status: 'approved' | 'rejected', comment: string) => Promise<void>;
  onBulkApprove?: (reportIds: string[], comment?: string) => Promise<void>;
  showConfirm?: (title: string, message: string, onConfirm: () => void | Promise<void>, options?: any) => void;
}

export default function AdminReports({ reports, userProfile, onReview, onBulkApprove, showConfirm }: AdminReportsProps) {
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

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>(todayStr);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterDate('');
    setFilterStatus('all');
  };

  const isFiltered = filterDate !== '' || filterStatus !== 'all' || searchTerm !== '';

  const filteredReports = reports.filter((r) => {
    const matchesDate = !filterDate || r.date === filterDate;
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesSearch = !searchTerm || 
      (r.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.todayWork || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.blockers || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.teamName || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesDate && matchesStatus && matchesSearch;
  });

  const pendingDisplayedReports = filteredReports.filter(r => r.status === 'pending');

  const handleBulkApproveClick = () => {
    if (pendingDisplayedReports.length === 0 || !onBulkApprove || !showConfirm) return;
    
    showConfirm(
      'Phê duyệt đồng loạt',
      `Bạn có chắc chắn muốn phê duyệt toàn bộ ${pendingDisplayedReports.length} báo cáo ĐANG CHỜ DUYỆT hiển thị trên màn hình hiện tại?\n\nTự động điền nhận xét: "Duyệt báo cáo tự động".`,
      async () => {
        setIsBulkApproving(true);
        try {
          const ids = pendingDisplayedReports.map(r => r.id);
          await onBulkApprove(ids, 'Duyệt báo cáo tự động');
        } finally {
          setIsBulkApproving(false);
        }
      },
      { confirmLabel: 'Phê duyệt tất cả', type: 'info' }
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-sky-500" />
            <span>Lynchpin Reports Log Ledger</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Audit, monitor and print overall student outputs directly utilizing the system filters
          </p>
        </div>

        {/* Filters & Export controls Row */}
        <div className="flex flex-wrap items-center gap-3">
          {pendingDisplayedReports.length > 0 && onBulkApprove && (
            <button
              onClick={handleBulkApproveClick}
              disabled={isBulkApproving}
              className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer outline-none bg-sky-100 hover:bg-sky-200 dark:bg-sky-900/40 dark:hover:bg-sky-800 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 h-7.5"
            >
              {isBulkApproving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              <span>Duyệt nhanh tất cả</span>
            </button>
          )}

          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-650 dark:text-red-400 text-xs font-bold transition-all cursor-pointer outline-none"
              title="Xóa bộ lọc"
            >
              <RotateCcw className="h-3.5 w-3.5 animate-spin-once" />
              <span>Xóa bộ lọc</span>
            </button>
          )}

          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              id="txt-search-reports"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reports text or authors..."
              className="pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs dark:bg-gray-900 dark:text-white w-48 focus:w-64 transition-all focus:outline-none focus:ring-1 focus:ring-sky-550"
            />
          </div>
          <input
            id="date-filter-admin"
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-550"
          />
          <select
            id="status-filter-admin"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs dark:bg-gray-900 dark:text-white h-7.5 focus:outline-none focus:ring-1 focus:ring-sky-550"
          >
            <option value="all">Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <CSVExport reports={filteredReports} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredReports.map((report) => (
          <ReportCard 
            key={report.id} 
            report={report} 
            userRole={userProfile.role} 
            userTeamId={userProfile.teamId} 
            onReview={onReview}
          />
        ))}

        {filteredReports.length === 0 && (
          <div className="col-span-1 md:col-span-2 py-16 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-sm">
            {filterDate === todayStr && filterStatus === 'pending' ? (
              <div>
                <p className="font-semibold text-slate-700 dark:text-gray-300">Không có báo cáo nào nộp ngày hôm nay ({todayStr}) đang chờ duyệt!</p>
                <button
                  onClick={handleResetFilters}
                  className="mt-3 text-sky-600 hover:text-sky-700 font-bold text-xs transition-all cursor-pointer outline-none underline"
                >
                  Xem tất cả báo cáo và các ngày trước
                </button>
              </div>
            ) : (
              <p className="font-medium text-slate-705 dark:text-gray-300">No reports match the provided filters.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
