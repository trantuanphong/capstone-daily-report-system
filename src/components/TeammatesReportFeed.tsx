/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Users } from 'lucide-react';
import { Report, UserProfile } from '../types';
import ReportCard from './ReportCard';

interface TeammatesReportFeedProps {
  reports: Report[];
  userProfile: UserProfile;
  teamNameString: string;
}

export default function TeammatesReportFeed({ reports, userProfile, teamNameString }: TeammatesReportFeedProps) {
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const teammateReports = reports.filter((r) => r.userId !== userProfile.uid);

  const filteredTeammateReports = teammateReports.filter((r) => {
    const matchesDate = !filterDate || r.date === filterDate;
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchesDate && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-sky-500" />
            <span>Teammates' Reports Feed</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Review the log of accomplishments submitted by other members of {teamNameString}
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-2.5 items-center">
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
        {filteredTeammateReports.map((report) => (
          <ReportCard 
            key={report.id} 
            report={report} 
            userRole={userProfile.role} 
            userTeamId={userProfile.teamId} 
          />
        ))}

        {filteredTeammateReports.length === 0 && (
          <div className="col-span-1 md:col-span-2 py-16 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-sm">
            No matching teammate records found for your current filter.
          </div>
        )}
      </div>
    </div>
  );
}
