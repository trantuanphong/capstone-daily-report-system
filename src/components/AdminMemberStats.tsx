import { useState } from 'react';
import { Users, FileText, CheckCircle2, XCircle, Clock, Search, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { UserProfile, Report, Team } from '../types';

interface AdminMemberStatsProps {
  allUsers: UserProfile[];
  reports: Report[];
  teams: Team[];
  teamNameMap: Record<string, string>;
}

type SortField = 'name' | 'team' | 'total' | 'approved' | 'rejected' | 'pending';
type SortOrder = 'asc' | 'desc';

export default function AdminMemberStats({ allUsers, reports, teams, teamNameMap }: AdminMemberStatsProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  
  // Sort States
  const [sortField, setSortField] = useState<SortField>('total');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filter only student members (the report submitters)
  const students = allUsers.filter(u => u.role === 'student');

  // Compute stats per student
  const studentStats = students.map(student => {
    const studentReports = reports.filter(r => r.userId === student.uid);
    const total = studentReports.length;
    const approved = studentReports.filter(r => r.status === 'approved').length;
    const rejected = studentReports.filter(r => r.status === 'rejected').length;
    const pending = studentReports.filter(r => r.status === 'pending').length;
    const percent = total > 0 ? Math.round((approved / total) * 100) : 0;

    return {
      uid: student.uid,
      name: student.name,
      email: student.email,
      teamId: student.teamId,
      teamName: teamNameMap[student.teamId] || 'Chưa phân nhóm',
      total,
      approved,
      rejected,
      pending,
      percent
    };
  });

  // Apply filters
  const filteredStats = studentStats.filter(stat => {
    const matchesSearch = stat.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          stat.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTeam = !selectedTeam || stat.teamId === selectedTeam;
    
    return matchesSearch && matchesTeam;
  });

  // Apply sorting
  const sortedStats = [...filteredStats].sort((a, b) => {
    let specA: any = a[sortField];
    let specB: any = b[sortField];

    if (typeof specA === 'string') {
      specA = specA.toLowerCase();
      specB = specB.toLowerCase();
    }

    if (specA < specB) return sortOrder === 'asc' ? -1 : 1;
    if (specA > specB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Aggregated summaries
  const totalSubmissions = studentStats.reduce((sum, stat) => sum + stat.total, 0);
  const avgSubmissions = students.length > 0 ? (totalSubmissions / students.length).toFixed(1) : '0';

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5 ml-1 inline" /> : <ChevronDown className="h-3.5 w-3.5 ml-1 inline" />;
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* Header Info */}
      <div>
        <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-500" />
          <span>Thống kê Báo cáo từng Thành viên</span>
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Bảng tổng hợp nhanh tổng số lượng báo cáo, số lượt duyệt thành công của từng sinh viên trong hệ thống.
        </p>
      </div>

      {/* Metric Summaries Board */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700 rounded-3xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-2xl text-purple-600 dark:text-purple-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 block">Tổng số thành viên (Student)</span>
            <span className="font-bold text-lg dark:text-white">{students.length} sinh viên</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700 rounded-3xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl text-emerald-600 dark:text-emerald-400">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 block">Tổng lượt nộp báo cáo</span>
            <span className="font-bold text-lg dark:text-white">{totalSubmissions} báo cáo</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700 rounded-3xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/40 rounded-2xl text-yellow-600 dark:text-yellow-400">
            <SlidersHorizontal className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 block">Trung bình nộp mỗi sinh viên</span>
            <span className="font-bold text-lg dark:text-white">{avgSubmissions} lượt / SV</span>
          </div>
        </div>
      </div>

      {/* Filtering and Search Controls bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800 rounded-2xl">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            id="txt-search-members"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc email thành viên..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-850 dark:text-white rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="w-full sm:w-56 shrink-0">
          <select
            id="sel-filter-team"
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-850 dark:text-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            <option value="">-- Tất cả nhóm đồ án --</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Stats Table view */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-950/25 text-gray-500 font-bold select-none">
                <th className="p-4 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400" onClick={() => handleSort('name')}>
                  <span>Thành viên</span>
                  <SortIcon field="name" />
                </th>
                <th className="p-4 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400" onClick={() => handleSort('team')}>
                  <span>Nhóm / Đồ án</span>
                  <SortIcon field="team" />
                </th>
                <th className="p-4 cursor-pointer text-center hover:text-purple-600 dark:hover:text-purple-400" onClick={() => handleSort('total')}>
                  <span className="flex items-center justify-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Tổng nộp</span>
                    <SortIcon field="total" />
                  </span>
                </th>
                <th className="p-4 cursor-pointer text-center text-emerald-600 hover:text-emerald-700" onClick={() => handleSort('approved')}>
                  <span className="flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Đã duyệt</span>
                    <SortIcon field="approved" />
                  </span>
                </th>
                <th className="p-4 cursor-pointer text-center text-red-500 hover:text-red-600" onClick={() => handleSort('rejected')}>
                  <span className="flex items-center justify-center gap-1">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Yêu cầu sửa</span>
                    <SortIcon field="rejected" />
                  </span>
                </th>
                <th className="p-4 cursor-pointer text-center text-amber-500 hover:text-amber-600" onClick={() => handleSort('pending')}>
                  <span className="flex items-center justify-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Chờ duyệt</span>
                    <SortIcon field="pending" />
                  </span>
                </th>
                <th className="p-4 text-center font-bold">
                  <span>Tỷ lệ duyệt</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {sortedStats.map((stat) => (
                <tr key={stat.uid} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors animate-fade-in">
                  <td className="p-4">
                    <strong className="block text-slate-800 dark:text-white font-bold">{stat.name}</strong>
                    <span className="text-gray-400 text-[10px] block font-mono">{stat.email}</span>
                  </td>
                  <td className="p-4 text-slate-600 dark:text-gray-300">
                    <span className="inline-flex px-2 py-1 rounded bg-gray-100 dark:bg-gray-900 border border-gray-150 dark:border-gray-850 font-bold text-[10px]">
                      {stat.teamName}
                    </span>
                  </td>
                  <td className="p-4 text-center font-bold text-slate-800 dark:text-white">
                    {stat.total}
                  </td>
                  <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                    {stat.approved}
                  </td>
                  <td className="p-4 text-center font-bold text-rose-500 dark:text-rose-400">
                    {stat.rejected}
                  </td>
                  <td className="p-4 text-center font-bold text-amber-500 dark:text-amber-450">
                    {stat.pending}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      stat.percent >= 80 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : stat.percent >= 50
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-955/20 dark:text-amber-400'
                        : stat.total === 0
                        ? 'bg-gray-100 text-gray-400 dark:bg-gray-900 dark:text-gray-500'
                        : 'bg-red-50 text-red-700 dark:bg-red-955/20 dark:text-red-400'
                    }`}>
                      {stat.total === 0 ? '- -' : `${stat.percent}%`}
                    </span>
                  </td>
                </tr>
              ))}

              {sortedStats.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-400 dark:text-gray-500 italic">
                    Không tìm thấy thành viên nào khớp với tiêu chuẩn tìm kiếm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
