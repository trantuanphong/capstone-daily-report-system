/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { UserCheck, UserPlus, AlertTriangle, Trash2 } from 'lucide-react';
import { UserProfile, Team } from '../types';

interface AdminUsersProps {
  allUsers: UserProfile[];
  teams: Team[];
  teamNameMap: Record<string, string>;
  adminUserEditMessage: string | null;
  whitelist: any[];
  onSaveUserByAdmin: (userId: string, assignedTeamId: string, role: 'student' | 'reviewer' | 'admin') => Promise<void>;
  onAddWhitelist: (email: string, name: string, role: 'student' | 'reviewer' | 'admin', teamId: string) => Promise<void>;
  onDeleteWhitelist: (emailKey: string) => Promise<void>;
}

export default function AdminUsers({
  allUsers,
  teams,
  teamNameMap,
  adminUserEditMessage,
  whitelist,
  onSaveUserByAdmin,
  onAddWhitelist,
  onDeleteWhitelist,
}: AdminUsersProps) {
  // Whitelist Form States
  const [wlEmail, setWlEmail] = useState<string>('');
  const [wlName, setWlName] = useState<string>('');
  const [wlRole, setWlRole] = useState<'student' | 'reviewer' | 'admin'>('student');
  const [wlTeamId, setWlTeamId] = useState<string>('');
  const [wlErrorMessage, setWlErrorMessage] = useState<string | null>(null);

  const handleAddWhitelistSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setWlErrorMessage(null);

    if (!wlEmail.trim()) {
      setWlErrorMessage("Gmail address is required.");
      return;
    }
    if (!wlEmail.trim().toLowerCase().includes('@')) {
      setWlErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!wlName.trim()) {
      setWlErrorMessage("Full Name registration index is required.");
      return;
    }

    try {
      await onAddWhitelist(wlEmail.trim().toLowerCase(), wlName.trim(), wlRole, wlTeamId);
      setWlEmail('');
      setWlName('');
      setWlRole('student');
      setWlTeamId('');
    } catch (err: any) {
      setWlErrorMessage(err.message || 'Failed to add whitelist.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold dark:text-white">Security Authorization Control Panel</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Pre-authorize specific student and reviewer Gmail accounts. Unregistered users are blocked safely from logging in or reading any database records.
          </p>
        </div>
      </div>

      {adminUserEditMessage && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 text-xs rounded-xl flex items-center gap-1.5 animate-fade-in">
          <UserCheck className="h-4 w-4 text-indigo-500 animate-pulse" />
          <span>{adminUserEditMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* COLUMN 1: PRE-AUTHORIZE / WHITELIST FORM */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-500" />
              <div>
                <h4 className="font-bold text-sm dark:text-white">Register Whitelisted Gmail</h4>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Pre-authorize a Capstone Student or Reviewer</p>
              </div>
            </div>

            <form onSubmit={handleAddWhitelistSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="txt-wl-email" className="text-[11px] font-bold text-slate-700 dark:text-gray-300">Gmail Address (@fpt.edu.vn or @gmail.com)</label>
                <input
                  id="txt-wl-email"
                  type="email"
                  value={wlEmail}
                  onChange={(e) => setWlEmail(e.target.value)}
                  placeholder="e.g. student35@fpt.edu.vn"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="txt-wl-name" className="text-[11px] font-bold text-slate-700 dark:text-gray-300">Expected Full Name</label>
                <input
                  id="txt-wl-name"
                  type="text"
                  value={wlName}
                  onChange={(e) => setWlName(e.target.value)}
                  placeholder="e.g. Nguyen Van A"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 bg-gray-50/55 dark:bg-gray-900/35 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="space-y-1.5">
                  <label htmlFor="sel-wl-role" className="text-[10px] uppercase font-mono font-black text-slate-600 dark:text-gray-400">Role</label>
                  <select
                    id="sel-wl-role"
                    value={wlRole}
                    onChange={(e) => setWlRole(e.target.value as 'student' | 'reviewer' | 'admin')}
                    className="w-full px-2 py-1 bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-700 rounded-lg text-xs dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer"
                  >
                    <option value="student">Student</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="sel-wl-team" className="text-[10px] uppercase font-mono font-black text-slate-600 dark:text-gray-400">Assign Team</label>
                  <select
                    id="sel-wl-team"
                    value={wlTeamId}
                    onChange={(e) => setWlTeamId(e.target.value)}
                    className="w-full px-2 py-1 bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-700 rounded-lg text-xs dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {wlErrorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 text-[10px] rounded-lg flex items-start gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-rose-500" />
                  <span>{wlErrorMessage}</span>
                </div>
              )}

              <button
                id="btn-add-whitelist"
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm select-none cursor-pointer outline-none"
              >
                <UserPlus className="h-4 w-4" />
                <span>Authorize User</span>
              </button>
            </form>
          </div>
        </div>

        {/* COLUMN 2 & 3: AUTHORIZATION WHITELIST & DIRECTORY */}
        <div className="xl:col-span-2 space-y-6">
          {/* WHITELIST ROSTER TABLE */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/55 dark:bg-gray-950/25">
              <div>
                <h4 className="font-bold text-sm dark:text-white">Active Whitelisted Accounts ({whitelist.length})</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Pre-authorized emails permitted to bypass login restricted bounds</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 font-bold bg-gray-50/20 dark:bg-gray-955/10">
                    <th className="p-3">Target Gmail Account</th>
                    <th className="p-3">Designated Profile</th>
                    <th className="p-3">Status Connection</th>
                    <th className="p-3 flex justify-end pr-5">Revoke</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {whitelist.map((item) => {
                    const isUserActive = allUsers.some((u) => u.email.toLowerCase() === item.email.toLowerCase());
                    return (
                      <tr key={item.email} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                        <td className="p-3">
                          <span className="font-mono text-slate-800 dark:text-gray-200 block">{item.email}</span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-gray-300">
                          <strong className="block text-xs font-bold text-slate-850 dark:text-white">{item.name}</strong>
                          <div className="inline-flex gap-1.5 items-center mt-1">
                            <span className="text-[9px] uppercase font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1 py-0.5 rounded font-black">
                              {item.role}
                            </span>
                            <span className="text-[10px] text-gray-450">
                              {teamNameMap[item.teamId] || 'No Team Assigned'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          {isUserActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/35 px-2 py-0.5 rounded-full">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Active Registered
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-450 bg-amber-50 dark:bg-amber-955/25 px-2 py-0.5 rounded-full">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                              Invitation Pending
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right pr-5">
                          <button
                            id={`btn-del-wl-${item.email.replace(/[^a-z0-9]/g, '-')}`}
                            onClick={() => onDeleteWhitelist(item.email)}
                            className="p-1 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-700 dark:bg-rose-950/30 dark:hover:bg-rose-950/55 dark:text-rose-405 transition-all cursor-pointer outline-none"
                            title="Revoke Pre-authorization"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {whitelist.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-400 dark:text-gray-500 italic">
                        No pre-authorized Student/Reviewer accounts present on the secure whitelist.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ACTIVE REGISTERED SIGNED-IN USER DIRECTORY VIEW */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/55 dark:bg-gray-950/25">
              <h4 className="font-bold text-sm dark:text-white">Active Signed-in Users Roster ({allUsers.length})</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">Accounts actively signed-in via Google credentials with current cached session uids</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 font-bold bg-gray-50/20 dark:bg-gray-955/10">
                    <th className="p-3">Verified Member Name</th>
                    <th className="p-3">Teammate Group Assignment</th>
                    <th className="p-3">Role Level Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {allUsers.map((user) => (
                    <tr key={user.uid} className="hover:bg-gray-50/40 dark:hover:bg-gray-850 transition-colors animate-fade-in">
                      <td className="p-3">
                        <strong className="block text-slate-805 dark:text-white font-bold">{user.name}</strong>
                        <span className="text-gray-400 text-[10px] block font-mono">{user.email}</span>
                      </td>
                      <td className="p-3">
                        <select
                          id={`sel-user-team-${user.uid}`}
                          value={user.teamId || ''}
                          onChange={(e) => onSaveUserByAdmin(user.uid, e.target.value, user.role)}
                          className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none dark:text-slate-200 cursor-pointer"
                        >
                          <option value="">Unassigned</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <select
                          id={`sel-user-role-${user.uid}`}
                          value={user.role}
                          onChange={(e) => onSaveUserByAdmin(user.uid, user.teamId, e.target.value as 'student' | 'reviewer' | 'admin')}
                          className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none dark:text-slate-200 cursor-pointer"
                        >
                          <option value="student">Student</option>
                          <option value="reviewer">Reviewer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
