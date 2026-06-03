/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Report, ReportStatus, UserRole } from '../types';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare, 
  User, 
  Calendar, 
  Users, 
  ShieldAlert, 
  ChevronDown, 
  ChevronUp, 
  Send,
  AlertTriangle,
  CheckSquare
} from 'lucide-react';

interface ReportCardProps {
  key?: string;
  report: Report;
  userRole: UserRole;
  userTeamId: string;
  onReview?: (reportId: string, status: 'approved' | 'rejected', comment: string) => Promise<void>;
}

export default function ReportCard({ report, userRole, userTeamId, onReview }: ReportCardProps) {
  const [comment, setComment] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canReview = 
    (userRole === 'admin') || 
    (userRole === 'reviewer' && report.teamId === userTeamId && report.status === 'pending');

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900">
            <CheckCircle className="h-3.5 w-3.5" />
            Đã duyệt
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900">
            <XCircle className="h-3.5 w-3.5" />
            Bị từ chối
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900">
            <Clock className="h-3.5 w-3.5" />
            Chờ duyệt
          </span>
        );
    }
  };

  const handleAction = async (status: 'approved' | 'rejected') => {
    if (!onReview) return;
    setError(null);
    setSubmitting(true);

    try {
      await onReview(report.id, status, comment.trim());
      setComment('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Cập nhật phê duyệt không thành công.');
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDate = (ts: any) => {
    if (!ts) return '';
    try {
      if (ts && typeof ts.seconds === 'number') {
        const dateObj = new Date(ts.seconds * 1000);
        return dateObj.toLocaleDateString('vi-VN', { 
          year: 'numeric', 
          month: 'numeric', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      if (ts instanceof Date) {
        return ts.toLocaleDateString('vi-VN', { 
          year: 'numeric', 
          month: 'numeric', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      if (typeof ts === 'string' || typeof ts === 'number') {
        const dateObj = new Date(ts);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString('vi-VN', { 
            year: 'numeric', 
            month: 'numeric', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
      return 'Vừa xong...';
    } catch (e) {
      return 'Vừa xong...';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden hover:border-gray-200 dark:hover:border-gray-600 transition-all">
      {/* Header Row */}
      <div className="p-5 border-b border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
            {(report.userName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <span>{report.userName || 'Sinh viên chưa rõ'}</span>
              <span className="text-gray-400 font-normal">|</span>
              <span className="text-xs text-gray-500 font-medium dark:text-gray-400">Nhóm: {report.teamName || 'Chưa gán nhóm'}</span>
            </h4>
            <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>Ngày báo cáo: <b>{report.date}</b></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {getStatusBadge(report.status)}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-150-none"
            aria-label="Toggle details"
          >
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Body Area */}
      <div className="p-5 space-y-5">
        {/* Rest Day Highlight */}
        {report.isRestDay && (
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/40 flex items-start gap-3 animate-fade-in">
            <span className="text-2xl pt-0.5">☕</span>
            <div>
              <h5 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest">Đăng ký Nghỉ phép / Vắng mặt</h5>
              <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1">Lý do: {report.restReason || 'Nghỉ phép cá nhân / Ngày lễ'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Hệ thống tự động tiếp nhận đăng ký vắng mặt của sinh viên trong ngày này. các chỉ tiêu kiểm soát tiến độ cơ bản được bỏ qua.
              </p>
            </div>
          </div>
        )}

        {/* Structured Task & Plan Grid (Lecturer View Highlights) */}
        {!report.isRestDay && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Column A: Yesterday's Real Progress Tasks */}
            <div className="p-4 rounded-2xl border border-sky-100 dark:border-sky-900/30 bg-sky-50/10 dark:bg-sky-950/5 flex flex-col h-full">
              <h5 className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest flex items-center gap-1.5 mb-3 pb-2 border-b border-sky-100/30">
                <CheckSquare className="h-4 w-4" />
                <span>Tiến độ thực tế hôm qua</span>
              </h5>
              {report.tasks && report.tasks.length > 0 ? (
                <div className="space-y-3 flex-1">
                  {report.tasks.map((t, index) => (
                    <div key={index} className="p-3 rounded-xl border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-900 shadow-xs space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-slate-805 dark:text-gray-100 break-all leading-tight">
                          {t.name}
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${t.progress === 100 ? 'bg-emerald-55 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-950' : 'bg-sky-50 text-sky-700 border border-sky-100 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-950'}`}>
                          {t.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${t.progress === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`}
                          style={{ width: `${t.progress}%` }} 
                        />
                      </div>
                      {t.reasonForRegress && t.reasonForRegress.trim() && (
                        <div className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-50/50 dark:bg-amber-950/10 p-2 rounded-lg border border-amber-100/30 mt-1 leading-relaxed">
                          ⚠️ <b>Lý do lùi tiến độ:</b> {t.reasonForRegress}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl">
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">Chưa khai báo task nào.</span>
                </div>
              )}
            </div>

            {/* Column B: Today's Target Plans */}
            <div className="p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/10 dark:bg-emerald-950/5 flex flex-col h-full">
              <h5 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-3 pb-2 border-b border-emerald-100/30">
                <CheckSquare className="h-4 w-4" />
                <span>Mục tiêu chỉ tiêu hôm nay</span>
              </h5>
              {report.planTasks && report.planTasks.length > 0 ? (
                <div className="space-y-3 flex-1">
                  {report.planTasks.map((pt, index) => {
                    // Check if Yesterday has this task to show a comparison badge
                    const matchingYesterday = report.tasks?.find(t => t.name.trim().toLowerCase() === pt.name.trim().toLowerCase());
                    return (
                      <div key={index} className="p-3 rounded-xl border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-900 shadow-xs space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-slate-805 dark:text-gray-100 break-all leading-tight">
                            {pt.name}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-305 dark:border-emerald-950">
                            {pt.targetProgress}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${pt.targetProgress}%` }} 
                          />
                        </div>
                        {matchingYesterday && (
                          <div className="text-[10px] text-sky-800 dark:text-sky-305 font-medium bg-sky-50/55 dark:bg-sky-950/10 p-1.5 rounded-md border border-sky-100/30 leading-snug">
                            📈 Hôm qua đạt: <b className="font-bold">{matchingYesterday.progress}%</b> &rarr; Hôm nay hướng tới: <b className="font-bold">{pt.targetProgress}%</b>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl">
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">Chưa khai báo mục tiêu.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Text descriptions if legacy reports or requested details */}
        {(!report.tasks || report.tasks.length === 0) && !report.isRestDay && (
          <div className="space-y-4">
            <div>
              <h5 className="text-xs font-bold text-sky-650 dark:text-sky-400 uppercase tracking-wide">Kết quả công việc hôm qua</h5>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1.5 leading-relaxed whitespace-pre-wrap">{report.todayWork}</p>
            </div>
            <div>
              <h5 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Kế hoạch, mục tiêu hôm nay</h5>
              <p className="text-sm text-gray-750 dark:text-gray-300 mt-1.5 leading-relaxed whitespace-pre-wrap">{report.tomorrowPlan}</p>
            </div>
          </div>
        )}

        {/* Blockers highlighting */}
        {report.blockers && report.blockers.trim() !== '' && (
          <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/30 dark:border-rose-900/40">
            <h5 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
              Khó khăn, vướng mắc gặp phải
            </h5>
            <p className="text-sm text-gray-750 dark:text-rose-250 mt-1.5 leading-relaxed whitespace-pre-wrap">{report.blockers}</p>
          </div>
        )}

        {/* Expanded complete text-view toggle for lecturers if they want to read exact formatted log strings */}
        {(!report.isRestDay && (report.tasks && report.tasks.length > 0)) && (
          <details className="text-[11px] text-gray-400 dark:text-gray-500 select-none cursor-pointer">
            <summary className="hover:text-gray-600 dark:hover:text-gray-300 font-semibold focus:outline-none">Xem bản tóm tắt nội dung sinh viên nộp</summary>
            <div className="mt-3 p-4 bg-gray-50/40 dark:bg-gray-950/20 border border-gray-150/50 dark:border-gray-800 rounded-xl space-y-3 cursor-default">
              <div>
                <span className="font-bold block text-gray-500 mb-1">Công việc hôm qua:</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans select-text leading-relaxed">{report.todayWork}</p>
              </div>
              <div className="border-t border-gray-150/40 dark:border-gray-800/40 pt-3">
                <span className="font-bold block text-gray-500 mb-1">Mục tiêu hôm nay:</span>
                <p className="text-sm text-gray-750 dark:text-gray-300 whitespace-pre-wrap font-sans select-text leading-relaxed">{report.tomorrowPlan}</p>
              </div>
            </div>
          </details>
        )}

        {/* Expanded planning and submission timestamps */}
        {(expanded || report.status !== 'pending' || canReview) && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700/60 text-[11px] text-gray-400 dark:text-gray-500 flex justify-between items-center flex-wrap gap-2">
            <span>Thời gian nộp bài: <b>{formattedDate(report.createdAt)}</b></span>
          </div>
        )}

        {/* Review feedback if resolved */}
        {report.status !== 'pending' && (
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700 text-xs mt-3 animate-fade-in">
            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 font-semibold mb-2">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-sky-500" />
                <span>Nhận xét đóng góp từ Thầy Cô / Người duyệt</span>
              </span>
              <span>Đã duyệt lúc: {formattedDate(report.reviewedAt)}</span>
            </div>
            {report.reviewComment ? (
              <p className="text-gray-700 dark:text-gray-300 italic leading-relaxed font-medium">&ldquo;{report.reviewComment}&rdquo;</p>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 italic">Không có nhận xét hoặc ý kiến bổ sung.</p>
            )}
            <div className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>ID Giáo viên: <code className="font-mono">{report.reviewedByName || report.reviewedBy}</code></span>
            </div>
          </div>
        )}

        {/* Review Form (Expandable review console) */}
        {canReview && (
          <div className="pt-5 mt-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
            <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" />
              <span>Bảng kết quả & ý kiến đánh giá từ Thầy Cô</span>
            </h5>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Ý kiến đóng góp / Yêu cầu chỉnh sửa (Không bắt buộc)
              </label>
              <textarea
                id={`txt-review-comment-${report.id}`}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Nhập phản hồi đóng góp hoặc lý do từ chối hỗ trợ sinh viên..."
                rows={2}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 text-[11px] rounded-lg border border-red-200/50 dark:border-red-900/50 flex gap-1.5 items-center shrink-0">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2.5">
              <button
                id={`btn-review-reject-${report.id}`}
                disabled={submitting}
                onClick={() => handleAction('rejected')}
                className="px-4 py-2 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-950/20 dark:hover:bg-rose-950/50 text-xs font-semibold rounded-lg shadow-sm transition-all select-none cursor-pointer"
              >
                Yêu cầu chỉnh sửa
              </button>
              <button
                id={`btn-review-approve-${report.id}`}
                disabled={submitting}
                onClick={() => handleAction('approved')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all select-none cursor-pointer"
              >
                Phê duyệt báo cáo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
