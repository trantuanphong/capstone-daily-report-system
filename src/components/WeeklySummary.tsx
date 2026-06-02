/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Calendar } from 'lucide-react';
import { Report, UserProfile } from '../types';

interface WeeklySummaryProps {
  allUsers: UserProfile[];
  userProfile: UserProfile;
  teamNameString: string;
  reports: Report[];
}

export default function WeeklySummary({ allUsers, userProfile, teamNameString, reports }: WeeklySummaryProps) {
  const teamStudents = allUsers.filter(
    (u) => u.teamId === userProfile.teamId && u.role === 'student'
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
          <Calendar className="h-5 w-5 text-sky-500" />
          <span>Weekly Summary Accomplishments</span>
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          A breakdown grouping teammate accomplishments of {teamNameString || 'Mocked Team'} to display weekly outputs.
        </p>
      </div>

      {/* Weekly aggregations list */}
      <div className="space-y-6">
        {teamStudents.map((stud) => {
          const studentReps = reports.filter((r) => r.userId === stud.uid);
          return (
            <div 
              key={stud.uid} 
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm space-y-4 animate-fade-in"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                  {stud.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white">{stud.name}</h4>
                  <p className="text-[10px] text-gray-400 truncate">{stud.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {studentReps.map((rep) => (
                  <div 
                    key={rep.id} 
                    className="p-4 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center gap-2 text-[10px] mb-2">
                        <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-gray-500">{rep.date}</span>
                        <span className={`px-2 py-0.5 rounded-full font-extrabold uppercase scale-90 ${
                          rep.status === 'approved' 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400' 
                            : rep.status === 'rejected' 
                              ? 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400' 
                              : 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400'
                        }`}>
                          {rep.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3 italic">&ldquo;{rep.todayWork}&rdquo;</p>
                    </div>
                  </div>
                ))}

                {studentReps.length === 0 && (
                  <p className="text-xs italic text-gray-400 dark:text-gray-500 py-3 block col-span-3">No report submissions recorded this week.</p>
                )}
              </div>
            </div>
          );
        })}

        {teamStudents.length === 0 && (
          <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-xs">
            No active students present in your current team.
          </div>
        )}
      </div>
    </div>
  );
}
