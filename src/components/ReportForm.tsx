/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { Report, ReportStatus, UserProfile } from '../types';
import { Calendar, CheckSquare, Save, X, AlertTriangle, Info, Edit3, Coffee } from 'lucide-react';

interface ReportFormProps {
  userProfile: UserProfile;
  existingReports: Report[]; // Students reports across all time to check date duplicates
  startTime: string;
  endTime: string;
  isWithinTimeRange: boolean;
  onSubmit: (reportData: {
    id?: string; // Optional if updating
    date: string;
    todayWork: string;
    blockers: string;
    tomorrowPlan: string;
    isRestDay?: boolean;
    restReason?: string;
  }) => Promise<void>;
}

export default function ReportForm({ userProfile, existingReports, startTime, endTime, isWithinTimeRange, onSubmit }: ReportFormProps) {
  // Get local date YYYY-MM-DD in Vietnam ICT timezone safely
  const getTodayDateString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localNow = new Date(now.getTime() - (offset * 60 * 1000));
    return localNow.toISOString().split('T')[0];
  };

  const date = getTodayDateString();
  const [todayWork, setTodayWork] = useState('');
  const [blockers, setBlockers] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  
  // Rest Day States
  const [isRestDay, setIsRestDay] = useState<boolean>(false);
  const [restReasonType, setRestReasonType] = useState<string>('Nghỉ phép cá nhân / Ngày lễ');
  const [customRestReason, setCustomRestReason] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [matchingReport, setMatchingReport] = useState<Report | null>(null);

  // When date or existing reports changes, check if they already have a report for that day
  useEffect(() => {
    const report = existingReports.find((r) => r.date === date && r.userId === userProfile.uid);
    if (report) {
      setMatchingReport(report);
      setTodayWork(report.todayWork);
      setBlockers(report.blockers);
      setTomorrowPlan(report.tomorrowPlan);
      setIsRestDay(!!report.isRestDay);
      if (report.isRestDay) {
        const r = report.restReason || '';
        const standardReasons = ['Nghỉ ốm / Khám sức khỏe', 'Nghỉ phép cá nhân / Ngày lễ', 'Ngày nghỉ lễ chính thức', 'Ôn thi học phần'];
        if (standardReasons.includes(r)) {
          setRestReasonType(r);
          setCustomRestReason('');
        } else {
          setRestReasonType('Khác');
          setCustomRestReason(r);
        }
      } else {
        setRestReasonType('Nghỉ phép cá nhân / Ngày lễ');
        setCustomRestReason('');
      }
      setFormError(null);
    } else {
      setMatchingReport(null);
      setTodayWork('');
      setBlockers('');
      setTomorrowPlan('');
      setIsRestDay(false);
      setRestReasonType('Nghỉ phép cá nhân / Ngày lễ');
      setCustomRestReason('');
      setFormError(null);
    }
  }, [date, existingReports, userProfile.uid]);

  // Determine lockout states
  const isLockedByTime = !matchingReport && !isWithinTimeRange;
  const isReportLocked = matchingReport && matchingReport.status !== 'pending';
  const isFormLocked = isLockedByTime || isReportLocked;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (isFormLocked) {
      setFormError("Form này hiện đang khóa. Bạn không thể thực hiện gửi báo cáo.");
      return;
    }

    let submittedTodayWork = todayWork.trim();
    let submittedBlockers = blockers.trim();
    let submittedTomorrowPlan = tomorrowPlan.trim();
    let computedRestReason = '';

    if (isRestDay) {
      const reason = restReasonType === 'Khác' ? customRestReason.trim() : restReasonType;
      if (restReasonType === 'Khác' && !reason) {
        setFormError("Vui lòng ghi rõ lý do nghỉ của bạn.");
        return;
      }
      computedRestReason = reason;
      submittedTodayWork = `Ngày nghỉ: ${reason}`;
      submittedBlockers = 'Không có';
      submittedTomorrowPlan = 'Quay lại công việc và lịch trình dự án Capstone chuẩn sau ngày nghỉ';
    } else {
      if (!submittedTodayWork) {
        setFormError("Nội dung công việc hôm nay không được để trống!");
        return;
      }
      if (submittedTodayWork.length > 5000) {
        setFormError("Mô tả công việc hôm nay quá dài (tối đa 5000 ký tự).");
        return;
      }
      if (submittedBlockers.length > 5000) {
        setFormError("Mô tả khó khăn quá dài (tối đa 5000 ký tự).");
        return;
      }
      if (!submittedTomorrowPlan) {
        setFormError("Kế hoạch ngày mai không được để trống!");
        return;
      }
      if (submittedTomorrowPlan.length > 5000) {
        setFormError("Mô tả kế hoạch ngày mai quá dài (tối đa 5000 ký tự).");
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit({
        id: matchingReport?.id, 
        date,
        todayWork: submittedTodayWork,
        blockers: submittedBlockers,
        tomorrowPlan: submittedTomorrowPlan,
        isRestDay,
        restReason: isRestDay ? computedRestReason : '',
      });
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Lỗi xảy ra khi gửi báo cáo lên Firestore.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'approved':
        return { text: 'Đã duyệt', styles: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900' };
      case 'rejected':
        return { text: 'Bị từ chối', styles: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900' };
      case 'pending':
      default:
        return { text: 'Chờ duyệt', styles: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900' };
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 md:p-8 shadow-sm max-w-3xl">
      <div className="border-b border-gray-100 dark:border-gray-700 pb-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-sky-500" />
            <span>{matchingReport ? 'Chỉnh Sửa Báo Cáo' : 'Nộp Báo Cáo Tiến Độ'}</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Mỗi sinh viên chỉ nộp hoặc cập nhật tối đa một báo cáo tiến độ mỗi ngày</p>
        </div>

        {/* Date Display (No longer selector) */}
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
          <Calendar className="h-4 w-4 text-sky-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-700 dark:text-white">Ngày báo cáo: {date} (Hôm nay)</span>
        </div>
      </div>

      {isLockedByTime && (
        <div className="mb-6 p-4 rounded-xl border border-rose-200 bg-rose-50/50 dark:bg-rose-950/10 dark:border-rose-900/60 flex flex-col gap-1.5 animate-fade-in">
          <h4 className="text-xs font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            Cổng Báo Cáo Đang Khóa
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
            Giờ nhận báo cáo quy định hàng ngày từ <strong className="font-bold text-slate-800 dark:text-white">{startTime}</strong> đến <strong className="font-bold text-slate-800 dark:text-white">{endTime}</strong>. 
            Do bạn chưa gửi báo cáo nào trong khung giờ này, bạn không thể tạo mới báo cáo nữa.
          </p>
        </div>
      )}

      {matchingReport && (
        <div className="mb-6 p-4 rounded-xl border flex flex-col gap-2 bg-gray-50/50 dark:bg-gray-900/30 dark:border-gray-700">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Info className="h-4 w-4 text-sky-500" />
              Bạn đã nộp báo cáo tiến độ cho hôm nay ({date})
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border ${getStatusBadge(matchingReport.status).styles}`}>
              {getStatusBadge(matchingReport.status).text}
            </span>
          </div>

          {isReportLocked ? (
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Báo cáo này đã được duyệt/bị từ chối ({getStatusBadge(matchingReport.status).text}). Hệ thống hiện đã khóa, bạn không thể chỉnh sửa.
            </p>
          ) : !isWithinTimeRange ? (
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Ngoài khung giờ nhận báo cáo ({startTime} - {endTime}). Nhưng vì bạn đã nộp trong khung giờ, bạn vẫn được phép cập nhật báo cáo hôm nay.
            </p>
          ) : (
            <p className="text-xs font-medium text-sky-605 dark:text-sky-400 flex items-center gap-1">
              <Edit3 className="h-3.5 w-3.5" />
              Báo cáo của bạn đang chờ duyệt. Bạn có thể tự do cập nhật nội dung bên dưới.
            </p>
          )}

          {matchingReport.reviewComment && (
            <div className="mt-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300">
              <strong className="font-bold">Nhận xét từ Thầy Cô:</strong> &ldquo;{matchingReport.reviewComment}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Rest Day Switch Block */}
      <div className="mb-6 p-4 rounded-2xl border border-sky-100 dark:border-sky-950/40 bg-sky-50/20 dark:bg-sky-950/5 flex flex-col gap-4">
        <label htmlFor="chk-rest-day" className="flex items-center gap-3 select-none cursor-pointer">
          <input
            id="chk-rest-day"
            type="checkbox"
            checked={isRestDay}
            disabled={isFormLocked}
            onChange={(e) => setIsRestDay(e.target.checked)}
            className="h-4.5 w-4.5 rounded border-gray-300 dark:border-gray-700 text-sky-600 focus:ring-sky-550 focus:outline-none"
          />
          <div className="flex items-center gap-1.5">
            <Coffee className="h-4 w-4 text-sky-500" />
            <span className="text-sm font-bold text-slate-800 dark:text-white">Tôi muốn đăng ký hôm nay là Ngày nghỉ phép / Vắng mặt</span>
          </div>
        </label>
        
        {isRestDay && (
          <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-150 dark:border-gray-700 flex flex-col gap-3 animate-fade-in">
            <div className="space-y-1">
              <label htmlFor="sel-rest-reason" className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                Lý do nghỉ phép / vắng mặt
              </label>
              <select
                id="sel-rest-reason"
                value={restReasonType}
                disabled={isFormLocked}
                onChange={(e) => setRestReasonType(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-250 dark:border-gray-750 bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 font-medium focus:ring-1 focus:ring-sky-500 cursor-pointer outline-none"
              >
                <option value="Nghỉ phép cá nhân / Ngày lễ">Nghỉ phép cá nhân / Ngày lễ</option>
                <option value="Nghỉ ốm / Khám sức khỏe">Nghỉ ốm / Khám sức khỏe</option>
                <option value="Ngày nghỉ lễ chính thức">Ngày nghỉ lễ chính thức</option>
                <option value="Ôn thi học phần">Ôn thi học phần</option>
                <option value="Khác">Lý do khác (Vui lòng ghi rõ ở dưới)</option>
              </select>
            </div>

            {restReasonType === 'Khác' && (
              <div className="space-y-1 animate-fade-in">
                <label htmlFor="txt-custom-rest-reason" className="block text-xs font-semibold text-gray-650 dark:text-gray-400">
                  Mô tả lý do nghỉ chi tiết
                </label>
                <input
                  id="txt-custom-rest-reason"
                  type="text"
                  value={customRestReason}
                  disabled={isFormLocked}
                  onChange={(e) => setCustomRestReason(e.target.value)}
                  placeholder="Ví dụ: Tham gia kỳ thi Hackathon do FPT tổ chức..."
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-750 dark:bg-gray-950 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            )}
            
            <p className="text-[11px] text-gray-400 leading-relaxed font-semibold italic">
              Lưu ý: Báo cáo ngày vắng mặt sẽ tự động điền các trường nội dung tiến độ để hệ thống bỏ qua các yêu cầu kiểm soát.
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Today's Accomplishments */}
        <div className={`space-y-2 transition-all ${isRestDay ? 'opacity-40 select-none pointer-events-none' : ''}`}>
          <label className="block text-sm font-semibold text-slate-700 dark:text-gray-200">
            1. Kết quả công việc hôm nay <span className="text-red-500">*</span>
          </label>
          <textarea
            id="txt-today-work"
            value={isRestDay ? `Ngày nghỉ: ${restReasonType === 'Khác' ? customRestReason || 'Lý do khác' : restReasonType}` : todayWork}
            disabled={isRestDay || isFormLocked}
            onChange={(e) => setTodayWork(e.target.value)}
            rows={4}
            placeholder="Mô tả chi tiết các tác vụ bạn đã hoàn thành hôm nay (Ví dụ: Xây dựng màn hình đăng nhập, phân tích dữ liệu Firestore, fix bug routing...)"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-950 placeholder-gray-400 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all disabled:opacity-60"
          />
          {!isRestDay && (
            <div className="flex justify-between text-[11px] text-gray-400 dark:text-gray-500 px-1">
              <span>Nên viết chi tiết rõ ràng</span>
              <span>{todayWork.length} / 5000 ký tự</span>
            </div>
          )}
        </div>

        {/* Blockers */}
        <div className={`space-y-2 transition-all ${isRestDay ? 'opacity-40 select-none pointer-events-none' : ''}`}>
          <label className="block text-sm font-semibold text-slate-700 dark:text-gray-200">
            2. Khó khăn, vướng mắc gặp phải <span className="text-gray-400 font-normal text-xs">(Không bắt buộc)</span>
          </label>
          <textarea
            id="txt-blockers"
            value={isRestDay ? 'Không có' : blockers}
            disabled={isRestDay || isFormLocked}
            onChange={(e) => setBlockers(e.target.value)}
            rows={2}
            placeholder="Các khó khăn cản trở tiến độ của bạn (Ví dụ: Chờ API từ phía backend, lỗi chặn CORS từ máy chủ, mất kết nối mạng...)"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-950 placeholder-gray-400 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all disabled:opacity-60"
          />
          {!isRestDay && (
            <div className="flex justify-between text-[11px] text-gray-400 dark:text-gray-500 px-1">
              <span>Để trống nếu không gặp vướng mắc nào</span>
              <span>{blockers.length} / 5000 ký tự</span>
            </div>
          )}
        </div>

        {/* Tomorrow's Plan */}
        <div className={`space-y-2 transition-all ${isRestDay ? 'opacity-40 select-none pointer-events-none' : ''}`}>
          <label className="block text-sm font-semibold text-slate-700 dark:text-gray-200">
            3. Mục tiêu & Kế hoạch ngày mai <span className="text-red-500">*</span>
          </label>
          <textarea
            id="txt-tomorrow-plan"
            value={isRestDay ? 'Trở lại lịch làm việc / Lịch nộp báo cáo Capstone vào hôm đi học lại' : tomorrowPlan}
            disabled={isRestDay || isFormLocked}
            onChange={(e) => setTomorrowPlan(e.target.value)}
            rows={3}
            placeholder="Mục tiêu bạn dự định sẽ làm gì vào ngày mai (Ví dụ: Viết tài liệu kiểm thử, kết nối Socket IO, tối ưu hóa giao diện di động...)"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-950 placeholder-gray-400 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all disabled:opacity-60"
          />
          {!isRestDay && (
            <div className="flex justify-between text-[11px] text-gray-400 dark:text-gray-500 px-1">
              <span>Nên chia nhỏ mục tiêu tuần tự</span>
              <span>{tomorrowPlan.length} / 5000 ký tự</span>
            </div>
          )}
        </div>

        {formError && (
          <div className="p-3 bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 text-xs rounded-xl border border-rose-200/50 dark:border-rose-900/50 flex gap-2 items-start shrink-0 animate-fade-in">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button
            id="btn-report-submit"
            type="submit"
            disabled={isFormLocked || submitting}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold shadow-sm select-none transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
              isFormLocked || submitting
                ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-md'
            }`}
          >
            <Save className="h-4 w-4" />
            <span>
              {submitting 
                ? 'Đang lưu báo cáo...' 
                : matchingReport 
                  ? 'Cập nhật báo cáo hành trình' 
                  : 'Nộp báo cáo ngày hôm nay'
              }
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
