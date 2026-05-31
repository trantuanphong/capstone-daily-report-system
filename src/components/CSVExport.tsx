/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Download } from 'lucide-react';
import { Report } from '../types';

interface CSVExportProps {
  reports: Report[];
  filename?: string;
}

export default function CSVExport({ reports, filename = 'Daily-Capstone-Reports.csv' }: CSVExportProps) {
  const exportToCSV = () => {
    if (reports.length === 0) return;

    // Headers
    const headers = [
      'ID Báo cáo',
      'Ngày',
      'Mã Sinh viên',
      'Tên Sinh viên',
      'ID Nhóm',
      'Tên Nhóm',
      'Công việc Hôm nay',
      'Khó khăn Vướng mắc',
      'Kế hoạch Ngày mai',
      'Trạng thái phê duyệt',
      'Nhận xét từ Giáo viên',
      'Người duyệt',
    ];

    // Map rows
    const rows = reports.map((report) => [
      report.id,
      report.date,
      report.userId,
      report.userName || 'Sinh viên chưa rõ',
      report.teamId,
      report.teamName || 'Chưa gán nhóm',
      // Clean texts from commas and newlines
      `"${(report.todayWork || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${(report.blockers || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${(report.tomorrowPlan || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      report.status === 'approved' ? 'Đã duyệt' : report.status === 'rejected' ? 'Bị từ chối' : 'Chờ duyệt',
      `"${(report.reviewComment || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      report.reviewedByName || report.reviewedBy || 'Chưa duyệt',
    ]);

    // Build content
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    // Create download trigger
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      id="btn-csv-export"
      onClick={exportToCSV}
      disabled={reports.length === 0}
      className={`inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-lg text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
        reports.length === 0
          ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed'
          : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
      }`}
    >
      <Download id="svg-download-csv" className="h-4 w-4" />
      Xuất tệp CSV ({reports.length})
    </button>
  );
}
