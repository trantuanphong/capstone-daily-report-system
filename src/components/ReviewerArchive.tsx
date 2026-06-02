/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Report, UserProfile } from '../types';
import ReportCard from './ReportCard';

interface ReviewerArchiveProps {
  reports: Report[];
  userProfile: UserProfile;
  teamNameString: string;
  onReview: (reportId: string, status: 'approved' | 'rejected', comment: string) => Promise<void>;
}

export default function ReviewerArchive({ reports, userProfile, teamNameString, onReview }: ReviewerArchiveProps) {
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredReports = reports.filter((r) => {
    const matchesDate = !filterDate || r.date === filterDate;
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchesDate && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-sky-500" />
            <span>Team Reports Archive</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Historical ledger of all submissions logged by the {teamNameString} members
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-550"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-550 h-7.5"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
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
            No report matching filters has been registered for your active team.
          </div>
        )}
      </div>
    </div>
  );
}
