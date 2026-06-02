/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { Plus, Trash2, Edit2, Save, AlertTriangle } from 'lucide-react';
import { Team } from '../types';

interface AdminTeamsProps {
  teams: Team[];
  initialStartTime: string;
  initialEndTime: string;
  initialReminderTime: string;
  onSaveConfig: (startTime: string, endTime: string, reminderTime: string) => Promise<void>;
  onCreateTeam: (name: string) => Promise<void>;
  onUpdateTeam: (id: string, name: string) => Promise<void>;
  onDeleteTeam: (id: string, teamName: string) => Promise<void>;
  smtpUser: string;
  smtpPass: string;
  smtpHost: string;
  smtpPort: number;
  onSaveEmailConfig: (user: string, pass: string, host: string, port: number) => Promise<void>;
}

export default function AdminTeams({
  teams,
  initialStartTime,
  initialEndTime,
  initialReminderTime,
  onSaveConfig,
  onCreateTeam,
  onUpdateTeam,
  onDeleteTeam,
  smtpUser,
  smtpPass,
  smtpHost,
  smtpPort,
  onSaveEmailConfig,
}: AdminTeamsProps) {
  // Config States
  const [sysStartTime, setSysStartTime] = useState<string>(initialStartTime);
  const [sysEndTime, setSysEndTime] = useState<string>(initialEndTime);
  const [sysReminderTime, setSysReminderTime] = useState<string>(initialReminderTime);

  // SMTP States
  const [emailUser, setEmailUser] = useState<string>(smtpUser);
  const [emailPass, setEmailPass] = useState<string>(smtpPass);
  const [emailHost, setEmailHost] = useState<string>(smtpHost || 'smtp.gmail.com');
  const [emailPort, setEmailPort] = useState<number>(smtpPort || 465);

  useEffect(() => {
    setEmailUser(smtpUser);
  }, [smtpUser]);

  useEffect(() => {
    setEmailPass(smtpPass);
  }, [smtpPass]);

  useEffect(() => {
    setEmailHost(smtpHost || 'smtp.gmail.com');
  }, [smtpHost]);

  useEffect(() => {
    setEmailPort(smtpPort || 465);
  }, [smtpPort]);

  // New Team Form States
  const [newTeamName, setNewTeamName] = useState<string>('');
  const [submittingTeam, setSubmittingTeam] = useState<boolean>(false);
  const [teamFormError, setTeamFormError] = useState<string | null>(null);

  // Edit Team Form States
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState<string>('');

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTeamFormError(null);
    if (!newTeamName.trim()) {
      setTeamFormError('Team Name cannot be empty.');
      return;
    }
    setSubmittingTeam(true);
    try {
      await onCreateTeam(newTeamName.trim());
      setNewTeamName('');
    } catch (err: any) {
      setTeamFormError(err.message || 'Error creating team.');
    } finally {
      setSubmittingTeam(false);
    }
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTeamFormError(null);
    if (!editingTeamId) return;
    if (!editingTeamName.trim()) {
      setTeamFormError('Tên nhóm không được để trống.');
      return;
    }
    setSubmittingTeam(true);
    try {
      await onUpdateTeam(editingTeamId, editingTeamName.trim());
      setEditingTeamId(null);
      setEditingTeamName('');
    } catch (err: any) {
      setTeamFormError(err.message || 'Error updating team.');
    } finally {
      setSubmittingTeam(false);
    }
  };

  const handleSaveConfigClick = async () => {
    if (!sysStartTime.trim() || !sysEndTime.trim() || !sysReminderTime.trim()) {
      alert('Vui lòng nhập đầy đủ mốc thời gian bắt đầu, hạn nộp báo cáo và thời điểm quét nhắc nhở!');
      return;
    }
    await onSaveConfig(sysStartTime.trim(), sysEndTime.trim(), sysReminderTime.trim());
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create Form and Settings column */}
        <div className="lg:col-span-1 space-y-8">
          {/* Create / Edit Team Form Card */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
            {editingTeamId ? (
              <>
                <div>
                  <h4 className="font-bold text-md dark:text-white text-emerald-600 dark:text-emerald-400">Cập nhật Nhóm Đồ án</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Chỉnh sửa tên nhóm của mã {editingTeamId}</p>
                </div>

                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block">Tên Nhóm / Tên Đề tài Đồ án</label>
                    <input
                      id="txt-admin-team-title-edit"
                      type="text"
                      value={editingTeamName}
                      onChange={(e) => setEditingTeamName(e.target.value)}
                      placeholder="Ví dụ: Đồ án IoT Y tế Thông minh"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  {teamFormError && (
                    <div className="p-3 bg-red-50 text-red-700 text-[10px] rounded-lg border border-red-150 flex items-start gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{teamFormError}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      id="btn-admin-team-cancel-edit"
                      type="button"
                      onClick={() => {
                        setEditingTeamId(null);
                        setEditingTeamName('');
                        setTeamFormError(null);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-medium transition-all select-none cursor-pointer outline-none"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      id="btn-admin-team-save-edit"
                      type="submit"
                      disabled={submittingTeam}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm select-none cursor-pointer outline-none"
                    >
                      <Save className="h-4 w-4" />
                      <span>Lưu</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div>
                  <h4 className="font-bold text-md dark:text-white">Tạo mới Nhóm Đồ án</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Đăng ký thêm nhóm đồ án Capstone vào hệ thống</p>
                </div>

                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block">Tên Nhóm / Tên Đề tài Đồ án</label>
                    <input
                      id="txt-admin-team-title"
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="Ví dụ: Đồ án IoT Y tế Thông minh"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  {teamFormError && (
                    <div className="p-3 bg-red-50 text-red-700 text-[10px] rounded-lg border border-red-150 flex items-start gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{teamFormError}</span>
                    </div>
                  )}

                  <button
                    id="btn-admin-team-create"
                    type="submit"
                    disabled={submittingTeam}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm select-none cursor-pointer outline-none"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{submittingTeam ? 'Đang tạo nhóm...' : 'Tạo nhóm mới'}</span>
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Cấu hình Giờ nộp Báo cáo Form Card */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 font-sans leading-none">
            <div>
              <h4 className="font-bold text-md dark:text-white">Cấu hình Hệ thống &amp; Quét nhắc nhở</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">Giới hạn thời gian nộp bài hàng ngày và thiếp lập quét báo cáo nhắc nhở tự động qua Gmail</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block">Giờ bắt đầu cho phép nộp (Ví dụ: 08:00)</label>
                <input
                  id="txt-sys-start-time"
                  type="text"
                  value={sysStartTime}
                  onChange={(e) => setSysStartTime(e.target.value)}
                  placeholder="e.g. 08:00"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block">Giờ kết thúc / Hạn nộp báo cáo (Ví dụ: 22:00)</label>
                <input
                  id="txt-sys-end-time"
                  type="text"
                  value={sysEndTime}
                  onChange={(e) => setSysEndTime(e.target.value)}
                  placeholder="e.g. 22:00"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block">Thời điểm hệ thống quét nhắc nhở (Ví dụ: 21:00)</label>
                <input
                  id="txt-sys-reminder-time"
                  type="text"
                  value={sysReminderTime}
                  onChange={(e) => setSysReminderTime(e.target.value)}
                  placeholder="e.g. 21:00"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <button
                id="btn-save-sys-config"
                onClick={handleSaveConfigClick}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer select-none outline-none"
              >
                <Save className="h-4 w-4" />
                <span>Lưu cấu hình hệ thống</span>
              </button>
            </div>
          </div>

          {/* Cấu hình Email gửi thư chuyên dùng */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 font-sans leading-none">
            <div>
              <h4 className="font-bold text-md dark:text-white">Cấu hình Email gửi thư chuyên dùng</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">Sử dụng tài khoản Email SMTP riêng (như Gmail App Password) để gửi các thư thông báo phê duyệt báo cáo tiến độ thay cho tài khoản cá nhân.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block">Địa chỉ Email (Username)</label>
                <input
                  id="txt-smtp-user"
                  type="email"
                  value={emailUser}
                  onChange={(e) => setEmailUser(e.target.value)}
                  placeholder="notifications@mydomain.com"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block">Mật khẩu Ứng dụng (App Password)</label>
                <input
                  id="txt-smtp-pass"
                  type="password"
                  value={emailPass}
                  onChange={(e) => setEmailPass(e.target.value)}
                  placeholder="Nhập App Password của Gmail hoặc SMTP"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block">SMTP Server Host</label>
                  <input
                    id="txt-smtp-host"
                    type="text"
                    value={emailHost}
                    onChange={(e) => setEmailHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block">SMTP Port</label>
                  <input
                    id="txt-smtp-port"
                    type="number"
                    value={emailPort || ''}
                    onChange={(e) => setEmailPort(Number(e.target.value))}
                    placeholder="465"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                id="btn-save-email-config"
                onClick={() => {
                  if (!emailUser.trim() || !emailPass.trim()) {
                    alert('Vui lòng điền địa chỉ email và mật khẩu ứng dụng SMTP!');
                    return;
                  }
                  onSaveEmailConfig(emailUser, emailPass, emailHost, emailPort);
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer select-none outline-none"
              >
                <Save className="h-4 w-4" />
                <span>Lưu cấu hình Email</span>
              </button>
            </div>
          </div>
        </div>

        {/* Teams List column */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm font-sans">
            <h4 className="font-bold text-md dark:text-white mb-4">Các Nhóm Đồ án hiện hành ({teams.length})</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {teams.map((t) => (
                <div 
                  key={t.id} 
                  className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/30 border border-gray-150 dark:border-gray-700 flex flex-col justify-between group transition-all"
                >
                  <div className="flex justify-between items-start gap-2 w-full">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-mono font-bold text-indigo-500 tracking-wide">Mã định danh: {t.id}</span>
                      <h5 className="font-bold text-sm text-slate-800 dark:text-white mt-1 leading-snug">{t.name}</h5>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingTeamId(t.id);
                          setEditingTeamName(t.name);
                        }}
                        title="Đổi tên nhóm"
                        className="p-1 px-1.5 rounded-lg text-gray-500 hover:text-sky-600 hover:bg-sky-550/10 border border-transparent hover:border-sky-100 dark:hover:border-sky-900 transition-all cursor-pointer outline-none"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteTeam(t.id, t.name)}
                        title="Xóa nhóm này"
                        className="p-1 px-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/30 border border-transparent hover:border-rose-100 transition-all cursor-pointer outline-none"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {teams.length === 0 && (
                <p className="text-gray-400 dark:text-gray-500 italic text-center text-xs py-10 col-span-2">Chưa có nhóm đồ án nào được định nghĩa trên hệ thống.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
