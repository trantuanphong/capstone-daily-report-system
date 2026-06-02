/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { Report, ReportStatus, UserProfile, ReportTask, ReportTaskPlan } from '../types';
import { Calendar, CheckSquare, Save, X, AlertTriangle, Info, Edit3, Coffee, Plus, Trash2, RefreshCw } from 'lucide-react';

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
    tasks?: ReportTask[];
    planTasks?: ReportTaskPlan[];
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
  const [tasks, setTasks] = useState<ReportTask[]>([]);
  const [planTasks, setPlanTasks] = useState<ReportTaskPlan[]>([]);
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
    
    // Find student previous day's report
    const studentPastReports = existingReports
      .filter((r) => r.userId === userProfile.uid && r.date < date)
      .sort((a, b) => b.date.localeCompare(a.date));
    const latestPastReport = studentPastReports[0];

    if (report) {
      setMatchingReport(report);
      setTasks(report.tasks || []);
      setPlanTasks(report.planTasks || []);
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
      
      // Since this is a morning report (báo cáo đầu ngày), yesterday's accomplishments tasks
      // are pre-filled with the planned tasks (planTasks) of yesterday's morning report.
      if (latestPastReport && latestPastReport.planTasks && latestPastReport.planTasks.length > 0) {
        setTasks(latestPastReport.planTasks.map(pt => ({
          name: pt.name,
          progress: pt.targetProgress, // Pre-fill with the target progress they planned
          reasonForRegress: ''
        })));
        
        // Also pre-fill today's plans with those same tasks (carrying over the names & starting next targets)
        setPlanTasks(latestPastReport.planTasks.map(pt => ({
          name: pt.name,
          targetProgress: Math.min(100, pt.targetProgress + 10) // Small push or let them adjust
        })));
      } else if (latestPastReport && latestPastReport.tasks && latestPastReport.tasks.length > 0) {
        setTasks(latestPastReport.tasks.map(t => ({
          name: t.name,
          progress: t.progress,
          reasonForRegress: ''
        })));
        setPlanTasks([]);
      } else {
        setTasks([]);
        setPlanTasks([]);
      }
      
      setTodayWork('');
      setBlockers('');
      setTomorrowPlan('');
      setIsRestDay(false);
      setRestReasonType('Nghỉ phép cá nhân / Ngày lễ');
      setCustomRestReason('');
      setFormError(null);
    }
  }, [date, existingReports, userProfile.uid]);

  const checkTaskStatus = (taskName: string) => {
    const result = {
      previousProgress: null as number | null,
      previousDate: null as string | null,
      teammateName: null as string | null,
      completedDate: null as string | null
    };

    if (!taskName || !taskName.trim()) return result;
    const nameTrimmedLower = taskName.trim().toLowerCase();

    // 1. Find previous progress of the same task for this student
    const studentPastReports = existingReports
      .filter((r) => r.userId === userProfile.uid && r.date < date)
      .sort((a, b) => b.date.localeCompare(a.date));

    let foundPrev = false;
    let foundCompleted = false;

    for (const r of studentPastReports) {
      if (r.tasks) {
        const match = r.tasks.find((t) => t.name.trim().toLowerCase() === nameTrimmedLower);
        if (match) {
          if (!foundPrev) {
            result.previousProgress = match.progress;
            result.previousDate = r.date;
            foundPrev = true;
          }
          if (match.progress === 100 && !foundCompleted) {
            result.completedDate = r.date;
            foundCompleted = true;
          }
        }
      }
    }

    // 2. Duplicate checks with any teammate today
    const otherTeamReportsToday = existingReports.filter(
      (r) => r.teamId === userProfile.teamId && r.date === date && r.userId !== userProfile.uid
    );
    for (const r of otherTeamReportsToday) {
      if (r.tasks) {
        const match = r.tasks.find((t) => t.name.trim().toLowerCase() === nameTrimmedLower);
        if (match) {
          result.teammateName = r.userName || r.userEmail || 'Thành viên khác';
          break;
        }
      }
    }

    return result;
  };

  const handleAddTask = () => {
    const newTaskName = '';
    setTasks([...tasks, { name: newTaskName, progress: 0, reasonForRegress: '' }]);
    // Keep list structure in sync by default: also add to plan tasks
    setPlanTasks([...planTasks, { name: newTaskName, targetProgress: 10 }]);
  };

  const handleRemoveTask = (index: number) => {
    const taskToRemove = tasks[index];
    const nextTasks = [...tasks];
    nextTasks.splice(index, 1);
    setTasks(nextTasks);

    // Synchronize removal in planTasks if there's an empty name match or name match
    if (taskToRemove) {
      const nextPlanTasks = [...planTasks];
      const matchIndex = nextPlanTasks.findIndex(pt => pt.name.trim().toLowerCase() === taskToRemove.name.trim().toLowerCase());
      if (matchIndex !== -1) {
        nextPlanTasks.splice(matchIndex, 1);
        setPlanTasks(nextPlanTasks);
      } else if (index < nextPlanTasks.length && !nextPlanTasks[index].name) {
        nextPlanTasks.splice(index, 1);
        setPlanTasks(nextPlanTasks);
      }
    }
  };

  const handleUpdateTask = (index: number, field: keyof ReportTask, value: any) => {
    const nextTasks = [...tasks];
    const prevName = nextTasks[index]?.name || '';
    nextTasks[index] = {
      ...nextTasks[index],
      [field]: value
    };
    setTasks(nextTasks);

    // If the name is changed, keep Today's Plan task name in sync at the matching place
    if (field === 'name') {
      const nextPlanTasks = [...planTasks];
      const matchIndex = nextPlanTasks.findIndex(pt => pt.name.trim().toLowerCase() === prevName.trim().toLowerCase());
      if (matchIndex !== -1) {
        nextPlanTasks[matchIndex].name = value;
        setPlanTasks(nextPlanTasks);
      } else if (index < nextPlanTasks.length && (!nextPlanTasks[index].name || nextPlanTasks[index].name === prevName)) {
        nextPlanTasks[index].name = value;
        setPlanTasks(nextPlanTasks);
      }
    } else if (field === 'progress') {
      // If we update yesterday's task progress, automatically nudge today's targeted plan progress to be >= yesterday progress + 10 (clamped to 100)
      const nextPlanTasks = [...planTasks];
      const taskName = nextTasks[index]?.name || '';
      const matchIndex = nextPlanTasks.findIndex(pt => pt.name.trim().toLowerCase() === taskName.trim().toLowerCase());
      if (matchIndex !== -1) {
        if (nextPlanTasks[matchIndex].targetProgress <= value) {
          nextPlanTasks[matchIndex].targetProgress = Math.min(100, value + 10);
          setPlanTasks(nextPlanTasks);
        }
      } else if (index < nextPlanTasks.length) {
        if (nextPlanTasks[index].targetProgress <= value) {
          nextPlanTasks[index].targetProgress = Math.min(100, value + 10);
          setPlanTasks(nextPlanTasks);
        }
      }
    }
  };

  const handleAddPlanTask = () => {
    setPlanTasks([...planTasks, { name: '', targetProgress: 0 }]);
  };

  const handleRemovePlanTask = (index: number) => {
    const nextPlanTasks = [...planTasks];
    nextPlanTasks.splice(index, 1);
    setPlanTasks(nextPlanTasks);
  };

  const handleUpdatePlanTask = (index: number, field: keyof ReportTaskPlan, value: any) => {
    const nextPlanTasks = [...planTasks];
    const prevName = nextPlanTasks[index]?.name || '';
    nextPlanTasks[index] = {
      ...nextPlanTasks[index],
      [field]: value
    };
    setPlanTasks(nextPlanTasks);

    if (field === 'name') {
      const nextTasks = [...tasks];
      const matchIndex = nextTasks.findIndex(t => t.name.trim().toLowerCase() === prevName.trim().toLowerCase());
      if (matchIndex !== -1) {
        nextTasks[matchIndex].name = value;
        setTasks(nextTasks);
      } else if (index < nextTasks.length && (!nextTasks[index].name || nextTasks[index].name === prevName)) {
        nextTasks[index].name = value;
        setTasks(nextTasks);
      }
    }
  };

  const handleSyncTasksFromYesterday = () => {
    if (tasks.length === 0) return;
    const updatedPlanTasks = [...planTasks];
    
    tasks.forEach((t) => {
      if (!t.name.trim()) return;
      const exists = updatedPlanTasks.some(pt => pt.name.trim().toLowerCase() === t.name.trim().toLowerCase());
      if (!exists) {
        updatedPlanTasks.push({
          name: t.name,
          targetProgress: Math.min(100, t.progress + 10)
        });
      }
    });
    
    setPlanTasks(updatedPlanTasks);
  };

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
      // Validate yesterday's tasks
      if (tasks.length > 0) {
        for (const t of tasks) {
          if (!t.name.trim()) {
            setFormError("Vui lòng điền tên đầy đủ cho tất cả các Chức năng/Task ngày hôm qua.");
            return;
          }
          if (t.progress < 0 || t.progress > 100) {
            setFormError("Tiến độ task phải nằm trong khoảng từ 0% đến 100%.");
            return;
          }
          const check = checkTaskStatus(t.name);
          if (check.previousProgress !== null && t.progress < check.previousProgress) {
            if (!t.reasonForRegress || !t.reasonForRegress.trim()) {
              setFormError(`Bạn cần giải trình lý do vì sao task "${t.name}" có tiến độ thực tế giảm hoặc bị lùi so với tiến độ trước đó (Từ ${check.previousProgress}% xuống còn ${t.progress}%).`);
              return;
            }
          }
        }
      }

      // Validate today's plan tasks
      if (planTasks.length > 0) {
        for (const pt of planTasks) {
          if (!pt.name.trim()) {
            setFormError("Vui lòng điền tên đầy đủ cho các Mục tiêu/Kế hoạch hôm nay.");
            return;
          }
          if (pt.targetProgress < 0 || pt.targetProgress > 100) {
            setFormError("Tiến độ mục tiêu phải nằm trong khoảng từ 0% đến 100%.");
            return;
          }
          
          // Cross-check: Target progress today cannot be less than real progress made yesterday
          const matchingYesterday = tasks.find(
            (t) => t.name.trim().toLowerCase() === pt.name.trim().toLowerCase()
          );
          if (matchingYesterday && pt.targetProgress < matchingYesterday.progress) {
            setFormError(`Mục tiêu tiến độ hôm nay của task "${pt.name}" (${pt.targetProgress}%) không thể nhỏ hơn tiến độ thực tế đã đạt hôm qua (${matchingYesterday.progress}%).`);
            return;
          }
        }
      }

      // Format todayWork (Yesterday's Progress text) with tasks if present
      if (tasks.length > 0) {
        const listStr = tasks.map((t) => {
          let line = `• Chức năng: ${t.name} (Tiến độ: ${t.progress}%)`;
          if (t.reasonForRegress && t.reasonForRegress.trim()) {
            line += ` [Giải trình lùi tiến độ: ${t.reasonForRegress.trim()}]`;
          }
          return line;
        }).join('\n');
        submittedTodayWork = `[DANH SÁCH TIẾN ĐỘ CHỨC NĂNG / TASK HÔM QUA]:\n${listStr}`;
      } else {
        if (!submittedTodayWork) {
          setFormError("Kết quả công việc ngày hôm qua không được để trống!");
          return;
        }
      }

      // Format tomorrowPlan (Today's Plan text) with planTasks if present
      if (planTasks.length > 0) {
        const planListStr = planTasks.map((pt) => {
          return `• Chức năng: ${pt.name} (Chỉ tiêu hôm nay: ${pt.targetProgress}%)`;
        }).join('\n');
        submittedTomorrowPlan = `[DANH SÁCH MỤC TIÊU TIẾN ĐỘ HÔM NAY]:\n${planListStr}`;
      } else {
        if (!submittedTomorrowPlan) {
          setFormError("Mục tiêu, kế hoạch ngày hôm nay không được để trống!");
          return;
        }
      }

      if (submittedTodayWork.length > 10000) {
        setFormError("Mô tả công việc hôm qua dán nhãn quá dài (tối đa 10000 ký tự).");
        return;
      }
      if (submittedBlockers.length > 5000) {
        setFormError("Mô tả khó khăn quá dài (tối đa 5000 ký tự).");
        return;
      }
      if (submittedTomorrowPlan.length > 10000) {
        setFormError("Mô tả kế hoạch ngày hôm nay quá dài (tối đa 10000 ký tự).");
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
        tasks: isRestDay ? [] : tasks,
        planTasks: isRestDay ? [] : planTasks,
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
            <CheckSquare className="h-5 w-5 text-sky-500 animate-bounce" />
            <span>{matchingReport ? 'Chỉnh Sửa Báo Cáo Đầu Ngày' : 'Nộp Báo Cáo Tiến Độ Đầu Ngày'}</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Báo cáo đầu ngày: Gồm tiến độ hôm qua, vướng mắc, và mục tiêu kế hoạch cho hôm nay</p>
        </div>

        {/* Date Display */}
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
          <Calendar className="h-4 w-4 text-sky-500" />
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
              Bạn đã nộp báo cáo đầu ngày hôm nay ({date})
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
            <p className="text-xs font-medium text-sky-600 dark:text-sky-400 flex items-center gap-1">
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
                <label htmlFor="txt-custom-rest-reason" className="block text-xs font-semibold text-gray-655 dark:text-gray-400">
                  Mô tả lý do nghỉ chi tiết
                </label>
                <input
                  id="txt-custom-rest-reason"
                  type="text"
                  value={customRestReason}
                  disabled={isFormLocked}
                  onChange={(e) => setCustomRestReason(e.target.value)}
                  placeholder="Ví dụ: Tham gia kỳ thi Hackathon do FPT tổ chức..."
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-755 dark:bg-gray-955 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            )}
            
            <p className="text-[11px] text-gray-400 leading-relaxed font-semibold italic">
              Lưu ý: Báo cáo ngày vắng mặt sẽ tự động điền các trường nội dung tiến độ để hệ thống bỏ qua các yêu cầu kiểm soát.
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION A: Yesterday's Work */}
        <div className={`space-y-4 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 bg-slate-50/30 dark:bg-gray-900/10 transition-all ${isRestDay ? 'opacity-40 select-none pointer-events-none' : ''}`}>
          <div className="border-b border-gray-150 dark:border-gray-800 pb-3 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-850 dark:text-gray-100 flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white uppercase">A</span>
                Tiến độ công việc ngày hôm qua <span className="text-rose-500 font-bold">*</span>
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Cập nhật phần trăm tiến độ (%) cụ thể cho các chức năng đang phát triển ngày hôm qua</p>
            </div>
            <button
              type="button"
              disabled={isRestDay || isFormLocked}
              onClick={handleAddTask}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-450 font-bold text-xs rounded-xl border border-sky-100 hover:bg-sky-100 dark:hover:bg-sky-900 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Thêm Task đã làm</span>
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="space-y-4">
              <div className="p-5 border-2 border-dashed border-gray-200 dark:border-gray-700/60 rounded-2xl flex flex-col items-center justify-center text-center bg-gray-50/20">
                <CheckSquare className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-1" />
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Không có cấu trúc Task được khai báo.</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Vui lòng nhấp nút nập ở góc trên để theo dõi chi tiết % hoặc điền bản tự tóm tắt dưới đây.</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-705 dark:text-gray-200">
                  Mô tả viết tay Kết quả ngày hôm qua <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="txt-today-work"
                  value={isRestDay ? `Ngày nghỉ: ${restReasonType === 'Khác' ? customRestReason || 'Lý do khác' : restReasonType}` : todayWork}
                  disabled={isRestDay || isFormLocked}
                  onChange={(e) => setTodayWork(e.target.value)}
                  rows={4}
                  placeholder="Mô tả chi tiết các tác vụ bạn đã hoàn thành hôm qua..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-950 placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all disabled:opacity-60"
                />
                {!isRestDay && (
                  <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 px-1">
                    <span>Nên viết chi tiết rõ ràng</span>
                    <span>{todayWork.length} / 5000 ký tự</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-3">
                {tasks.map((t, idx) => {
                  const check = checkTaskStatus(t.name);
                  const hasRegress = check.previousProgress !== null && t.progress < check.previousProgress;

                  return (
                    <div key={idx} className="p-4 rounded-2xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-900/40 shadow-sm relative space-y-3 group border-l-4 border-l-sky-500 animate-slide-down">
                      <div className="flex items-start justify-between gap-4">
                        {/* Name Entry */}
                        <div className="flex-1 space-y-1">
                          <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tên chức năng / Task {idx + 1}</label>
                          <input
                            type="text"
                            value={t.name}
                            disabled={isRestDay || isFormLocked}
                            onChange={(e) => handleUpdateTask(idx, 'name', e.target.value)}
                            placeholder="Ví dụ: Thiết kế Dashboard, Viết API đăng ký..."
                            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-750 dark:bg-gray-950 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                          />
                        </div>

                        {/* Progress % Entry */}
                        <div className="w-28 space-y-1">
                          <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tiến độ (%)</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={t.progress}
                              disabled={isRestDay || isFormLocked}
                              onChange={(e) => handleUpdateTask(idx, 'progress', Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                              className="w-16 px-2 py-2 text-xs font-mono font-bold text-center rounded-xl border border-gray-200 dark:border-gray-750 dark:bg-gray-950 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                            />
                            <span className="text-xs font-bold text-gray-500">%</span>
                          </div>
                        </div>

                        {/* Remove Button */}
                        {!isFormLocked && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTask(idx)}
                            className="mt-5 p-2 text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer"
                            title="Xóa task"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Progress slider bar */}
                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${t.progress === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`} 
                          style={{ width: `${t.progress}%` }} 
                        />
                      </div>

                      {/* Real-time Validation Badges & Alerts */}
                      <div className="space-y-1.5 pt-1.5 border-t border-gray-50 dark:border-gray-800/60">
                        {/* Previous progress */}
                        {check.previousProgress !== null && (
                          <p className="text-[10px] font-medium text-slate-500 dark:text-gray-400 flex items-center gap-1">
                            <span>ℹ️ Lần báo trước: <strong className="font-bold text-slate-700 dark:text-white">{check.previousProgress}%</strong> ({check.previousDate})</span>
                          </p>
                        )}

                        {check.completedDate && (
                          <div className="p-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/10 border border-amber-200/50 text-[10px] text-amber-800 dark:text-amber-400 font-medium flex gap-1 items-start">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-550" />
                            <span>Chú ý: Chức năng này đã báo 100% vào {check.completedDate}.</span>
                          </div>
                        )}

                        {check.teammateName && (
                          <div className="p-2 rounded-lg bg-rose-50/60 dark:bg-rose-950/10 border border-rose-200/50 text-[10px] text-rose-800 dark:text-rose-400 font-medium flex gap-1 items-start">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                            <span>Cảnh báo: Trùng tên task với thành viên <strong className="font-bold">{check.teammateName}</strong> trong hôm nay.</span>
                          </div>
                        )}

                        {hasRegress && (
                          <div className="space-y-1 bg-amber-50/30 dark:bg-amber-950/5 p-2 rounded-xl border border-amber-200/40">
                            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Lùi tiến độ: Giải trình lý do (Bắt buộc)</span>
                            </p>
                            <textarea
                              value={t.reasonForRegress || ''}
                              disabled={isFormLocked}
                              onChange={(e) => handleUpdateTask(idx, 'reasonForRegress', e.target.value)}
                              placeholder="Lý do lùi tiến độ (ví dụ: Thay đổi database schema, fix bug phát sinh...)"
                              className="w-full text-[10px] px-2 py-1.5 bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              rows={1}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!isRestDay && (
                <div className="p-3.5 bg-sky-50/40 dark:bg-sky-950/20 border border-sky-100/60 dark:border-sky-900/40 rounded-xl text-[11px] text-sky-700 dark:text-sky-305">
                  ℹ️ <span className="font-bold">Đã kích hoạt Chế độ Task:</span> Hệ thống tự động tạo bản tường trình công việc hôm qua từ danh sách phía trên giúp tiết kiệm thời gian nhập liệu của bạn.
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION B: Blockers */}
        <div className={`space-y-2 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 bg-slate-50/30 dark:bg-gray-900/10 transition-all ${isRestDay ? 'opacity-40 select-none pointer-events-none' : ''}`}>
          <label className="block text-sm font-bold text-slate-850 dark:text-gray-100 flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white uppercase">B</span>
            Khó khăn, vướng mắc gặp phải ngày hôm qua <span className="text-gray-400 font-normal text-xs">(Không bắt buộc)</span>
          </label>
          <textarea
            id="txt-blockers"
            value={isRestDay ? 'Không có' : blockers}
            disabled={isRestDay || isFormLocked}
            onChange={(e) => setBlockers(e.target.value)}
            rows={2}
            placeholder="Các khó khăn cản trở tiến độ của bạn ngày hôm qua (Ví dụ: Lỗi cổng CORS mạng ảo, chưa có tài liệu API, mất điện...)"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-950 placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all disabled:opacity-60"
          />
          {!isRestDay && (
            <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 px-1">
              <span>Để trống nếu mọi việc thuận lợi</span>
              <span>{blockers.length} / 5000 ký tự</span>
            </div>
          )}
        </div>

        {/* SECTION C: Today's Plan (PlanTasks and Targets) */}
        <div className={`space-y-4 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 bg-slate-50/30 dark:bg-gray-900/10 transition-all ${isRestDay ? 'opacity-40 select-none pointer-events-none' : ''}`}>
          <div className="border-b border-gray-150 dark:border-gray-800 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-850 dark:text-gray-100 flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white uppercase">C</span>
                Mục tiêu & Kế hoạch ngày hôm nay <span className="text-rose-500 font-bold">*</span>
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                Khai báo các task/chức năng bạn dự định giải quyết ngày hôm nay và mục tiêu tiến độ (%) hướng tới
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {tasks.length > 0 && (
                <button
                  type="button"
                  disabled={isRestDay || isFormLocked}
                  onClick={handleSyncTasksFromYesterday}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-450 font-bold text-xs rounded-xl border border-sky-100 hover:bg-sky-100 dark:hover:bg-sky-900 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none animate-pulse hover:animate-none"
                  title="Copy danh sách task từ tiến độ hôm qua sang mục tiêu hôm nay"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Đồng bộ từ hôm qua</span>
                </button>
              )}
              <button
                type="button"
                disabled={isRestDay || isFormLocked}
                onClick={handleAddPlanTask}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl border border-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Thêm Mục tiêu Task hôm nay</span>
              </button>
            </div>
          </div>

          {/* Quick Guidance Alert for Today's Planner, satisfying "ví dụ: báo cáo hôm qua là x%, kế hoạch hôm nay là y%..." */}
          {!isRestDay && (
            <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl text-xs flex gap-2 items-start shrink-0">
              <span className="text-base leading-none">🧠</span>
              <div className="space-y-0.5 leading-relaxed text-amber-900 dark:text-amber-400">
                <span className="font-bold">Mẹo đặt chỉ tiêu:</span> Đặt mục tiêu lũy kế cho hôm nay dựa theo trạng thái hôm qua. 
                <p className="mt-1 font-mono text-[10px] bg-white/60 dark:bg-black/20 p-1.5 rounded-md border border-amber-200/40">
                  <span className="text-sky-600 dark:text-sky-400 font-bold">Ví dụ:</span> Hôm qua hoàn thành Task login <strong className="font-bold">40%</strong>, hôm nay đặt mục tiêu hoàn tất tiếp đạt lên <strong className="font-bold">80%</strong>, hoặc thêm Task mới phát sinh.
                </p>
              </div>
            </div>
          )}

          {planTasks.length === 0 ? (
            <div className="space-y-4">
              <div className="p-5 border-2 border-dashed border-gray-200 dark:border-gray-700/60 rounded-2xl flex flex-col items-center justify-center text-center bg-gray-50/20">
                <CheckSquare className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-1" />
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Không có cấu trúc mục tiêu được chuẩn bị.</p>
                <p className="text-[10px] text-gray-405 mt-0.5">Vui lòng nhấp &ldquo;Thêm Mục tiêu Task hôm nay&rdquo; ở trên, hoặc tự viết nội dung bên dưới.</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-705 dark:text-gray-200">
                  Mô tả viết tay Kế hoạch hôm nay <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="txt-tomorrow-plan"
                  value={isRestDay ? 'Trở lại lịch làm việc / Lịch nộp báo cáo Capstone vào hôm đi học lại' : tomorrowPlan}
                  disabled={isRestDay || isFormLocked}
                  onChange={(e) => setTomorrowPlan(e.target.value)}
                  rows={3}
                  placeholder="Mô tả các mục tiêu bạn dự định sẽ làm gì hôm nay..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-950 placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all disabled:opacity-60"
                />
                {!isRestDay && (
                  <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 px-1">
                    <span>Nên ghi cụ thể công việc chính</span>
                    <span>{tomorrowPlan.length} / 5000 ký tự</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-3">
                {planTasks.map((pt, idx) => {
                  // Find yesterday's task of same name to compute comparisons in real time
                  const matchingYesterdayTask = tasks.find(
                    (t) => t.name.trim().toLowerCase() === pt.name.trim().toLowerCase()
                  );

                  return (
                    <div key={idx} className="p-4 rounded-2xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-900/40 shadow-sm relative space-y-3 group border-l-4 border-l-emerald-500 animate-slide-down">
                      <div className="flex items-start justify-between gap-4">
                        {/* Planned Task Name Entry */}
                        <div className="flex-1 space-y-1">
                          <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tên chức năng / Task mục tiêu {idx + 1}</label>
                          <input
                            type="text"
                            value={pt.name}
                            disabled={isRestDay || isFormLocked}
                            onChange={(e) => handleUpdatePlanTask(idx, 'name', e.target.value)}
                            placeholder="Ví dụ: Hoàn tất API payment Stripe, tối ưu UI..."
                            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-750 dark:bg-gray-950 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        {/* Planned Target Progress Entry */}
                        <div className="w-32 space-y-1">
                          <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mục tiêu hôm nay</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={pt.targetProgress}
                              disabled={isRestDay || isFormLocked}
                              onChange={(e) => handleUpdatePlanTask(idx, 'targetProgress', Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                              className="w-16 px-2 py-2 text-xs font-mono font-bold text-center rounded-xl border border-gray-200 dark:border-gray-750 dark:bg-gray-950 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                            <span className="text-xs font-bold text-gray-500">%</span>
                          </div>
                        </div>

                        {/* Remove Button */}
                        {!isFormLocked && (
                          <button
                            type="button"
                            onClick={() => handleRemovePlanTask(idx)}
                            className="mt-5 p-2 text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer"
                            title="Xóa kế hoạch"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Visual indicator bar */}
                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-300 bg-emerald-500" 
                          style={{ width: `${pt.targetProgress}%` }} 
                        />
                      </div>

                      {/* Dynamic helpful badge / instructions matching user requests in real time */}
                      {pt.name.trim() && (
                        <div className="pt-2 text-[10px] border-t border-gray-50 dark:border-gray-850 flex items-center gap-2 flex-wrap font-medium">
                          {matchingYesterdayTask ? (
                            <span className="px-2 py-0.5 bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 text-sky-800 dark:text-sky-300 rounded-md">
                              📊 Hôm qua thực đạt: <strong className="font-bold">{matchingYesterdayTask.progress}%</strong> 
                              &rarr; Mục tiêu hôm nay: <strong className="font-bold">{pt.targetProgress}%</strong>
                              {pt.targetProgress <= matchingYesterdayTask.progress && (
                                <span className="text-rose-500 ml-1 font-bold">(Vui lòng đặt mục tiêu lớn hơn hoặc bằng tiến độ hôm qua)</span>
                              )}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 rounded-md">
                              ✨ Task mới đăng ký kế hoạch hôm nay
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!isRestDay && (
                <div className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/40 rounded-xl text-[11px] text-emerald-700 dark:text-emerald-305">
                  ℹ️ <span className="font-bold">Đã kích hoạt Chế độ Kế hoạch:</span> Hệ thống tự động tạo bản viết tay Kế hoạch hôm nay từ danh sách phía trên giúp đồng bộ dữ liệu hoàn hảo.
                </div>
              )}
            </div>
          )}
        </div>

        {formError && (
          <div className="p-3 bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 text-xs rounded-xl border border-rose-200/50 dark:border-rose-900/50 flex gap-2 items-start shrink-0 animate-fade-in">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Action Button */}
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
                  ? 'Cập nhật báo cáo đầu ngày' 
                  : 'Nộp báo cáo đầu ngày hôm nay'
              }
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
