/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Mail } from 'lucide-react';

interface EmailInboxProps {
  notifications: any[];
}

export default function EmailInbox({ notifications }: EmailInboxProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <Mail className="h-5 w-5 text-sky-500 shrink-0" />
            <span>Hộp thư Email và Thông báo từ Giáo viên</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Hộp thư giả lập các email thông báo phê duyệt hoặc từ chối được giáo viên hướng dẫn gửi tự động
          </p>
        </div>
      </div>

      <div className="space-y-4 max-w-4xl">
        {notifications.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-gray-150 dark:border-gray-800 rounded-3xl bg-white dark:bg-gray-800">
            <Mail className="h-10 w-10 text-gray-300 dark:text-gray-650 mx-auto mb-3 animate-pulse" />
            <p className="text-sm font-bold text-slate-700 dark:text-gray-300">Hộp thư của bạn đang trống</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-md mx-auto">
              Khi được phân nhóm, nộp bài báo cáo và nhận quyết định duyệt/từ chối kèm nhận xét từ Giáo viên hướng dẫn, thông báo email dạng thức đầy đủ sẽ hiện thực tại đây.
            </p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div 
              key={notif.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 hover:border-gray-250 dark:hover:border-gray-600 transition-all flex flex-col gap-3 animate-fade-in"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-50 dark:border-gray-700 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 ${
                    notif.status === 'approved' 
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'
                  }`}>
                    {notif.status === 'approved' ? 'Đã phê duyệt' : 'Yêu cầu sửa'}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{notif.subject}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Người gửi: <b>{notif.senderName} ({notif.senderEmail})</b> &bull; Đến: {notif.recipientEmail}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0 select-none font-mono">
                  {notif.reportDate ? `Ngày báo cáo: ${notif.reportDate}` : ''}
                </span>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-905/40 p-4 rounded-xl text-xs text-gray-750 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-sans border border-slate-100/40 dark:border-slate-800">
                {notif.body}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
