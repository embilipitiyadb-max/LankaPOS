import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { formatLKR, formatDate, formatTime as _formatTime } from '../../lib/utils';
void _formatTime;
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import {
  Plus,
  Search,
  Users,
  Clock,
  DollarSign,
  Edit2,
  UserCheck,
  UserX,
  Calendar,
} from 'lucide-react';

type TabType = 'employees' | 'attendance' | 'salary';

interface EmployeeForm {
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'cashier' | 'employee';
  salary: string;
  active: boolean;
}

interface AttendanceForm {
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'present' | 'absent' | 'late' | 'half-day';
}

const emptyEmployeeForm: EmployeeForm = {
  name: '',
  email: '',
  phone: '',
  role: 'employee',
  salary: '0',
  active: true,
};

const emptyAttendanceForm: AttendanceForm = {
  employeeId: '',
  date: new Date().toISOString().slice(0, 10),
  checkIn: '08:00',
  checkOut: '17:00',
  status: 'present',
};

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'employee', label: 'Employee' },
];

const statusOptions = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'half-day', label: 'Half Day' },
];

const roleBadgeVariant: Record<string, 'danger' | 'info' | 'info'> = {
  admin: 'danger',
  cashier: 'info',
  employee: 'info',
};

const attendanceStatusBadge: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
  present: 'success',
  absent: 'danger',
  late: 'warning',
  'half-day': 'info',
};

export default function EmployeesPage() {
  const { employees, attendance, addEmployee, updateEmployee, addAttendance } = useStore();

  const [activeTab, setActiveTab] = useState<TabType>('employees');
  const [searchQuery, setSearchQuery] = useState('');

  // Employee modal state
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeForm, setEmployeeForm] = useState<EmployeeForm>(emptyEmployeeForm);

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceEmployeeId, setAttendanceEmployeeId] = useState('');
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState<AttendanceForm>(emptyAttendanceForm);

  // Salary state
  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [paidStatus, setPaidStatus] = useState<Record<string, boolean>>({});

  // Employee stats
  const employeeStats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.active).length;
    const inactive = employees.filter((e) => !e.active).length;
    const payroll = employees.filter((e) => e.active).reduce((sum, e) => sum + e.salary, 0);
    return { total, active, inactive, payroll };
  }, [employees]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.phone.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  // Attendance stats for selected date
  const attendanceStats = useMemo(() => {
    const dayRecords = attendance.filter((a) => a.date.slice(0, 10) === attendanceDate);
    const present = dayRecords.filter((a) => a.status === 'present').length;
    const absent = dayRecords.filter((a) => a.status === 'absent').length;
    const late = dayRecords.filter((a) => a.status === 'late').length;
    const halfDay = dayRecords.filter((a) => a.status === 'half-day').length;
    return { present, absent, late, halfDay };
  }, [attendance, attendanceDate]);

  // Attendance records for selected date
  const attendanceRecords = useMemo(() => {
    return attendance
      .filter((a) => a.date.slice(0, 10) === attendanceDate)
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [attendance, attendanceDate]);

  // Salary calculations
  const salaryData = useMemo(() => {
    const [year, month] = salaryMonth.split('-').map(Number);
    const monthAttendance = attendance.filter((a) => {
      const d = new Date(a.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });

    let totalBaseSalary = 0;
    let totalDeductions = 0;

    const rows = employees.map((emp) => {
      const empAttendance = monthAttendance.filter((a) => a.employeeId === emp.id);
      const absentDays = empAttendance.filter((a) => a.status === 'absent').length;
      const halfDays = empAttendance.filter((a) => a.status === 'half-day').length;
      const dailyRate = emp.salary / 30;
      const deductions = absentDays * dailyRate + halfDays * (dailyRate / 2);
      const netSalary = emp.salary - deductions;

      totalBaseSalary += emp.salary;
      totalDeductions += deductions;

      return {
        employee: emp,
        baseSalary: emp.salary,
        deductions,
        netSalary,
        isPaid: paidStatus[emp.id] ?? false,
      };
    });

    return { rows, totalBaseSalary, totalDeductions, netPayroll: totalBaseSalary - totalDeductions };
  }, [employees, attendance, salaryMonth, paidStatus]);

  // Employee options for selects
  const employeeOptions = useMemo(
    () => employees.map((e) => ({ value: e.id, label: e.name })),
    [employees]
  );

  // Handlers
  const openAddEmployee = () => {
    setEditingEmployeeId(null);
    setEmployeeForm(emptyEmployeeForm);
    setEmployeeModalOpen(true);
  };

  const openEditEmployee = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    if (!emp) return;
    setEditingEmployeeId(id);
    setEmployeeForm({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      role: emp.role,
      salary: String(emp.salary),
      active: emp.active,
    });
    setEmployeeModalOpen(true);
  };

  const handleSaveEmployee = async () => {
    const data = {
      name: employeeForm.name,
      email: employeeForm.email,
      phone: employeeForm.phone,
      role: employeeForm.role,
      salary: Number(employeeForm.salary) || 0,
      active: employeeForm.active,
      userId: '',
      joinedAt: new Date().toISOString(),
    };
    if (editingEmployeeId) {
      await updateEmployee(editingEmployeeId, data);
    } else {
      await addEmployee(data);
    }
    setEmployeeModalOpen(false);
  };

  const handleCheckIn = () => {
    if (!attendanceEmployeeId) return;
    const emp = employees.find((e) => e.id === attendanceEmployeeId);
    if (!emp) return;
    addAttendance({
      employeeId: emp.id,
      employeeName: emp.name,
      date: new Date().toISOString(),
      checkIn: new Date().toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', hour12: false }),
      status: 'present',
    });
  };

  const handleCheckOut = () => {
    if (!attendanceEmployeeId) return;
    const existingRecord = attendance.find(
      (a) =>
        a.employeeId === attendanceEmployeeId &&
        a.date.slice(0, 10) === new Date().toISOString().slice(0, 10) &&
        !a.checkOut
    );
    if (existingRecord) {
      const _checkout = new Date().toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', hour12: false });
      void _checkout;
    }
  };

  const openAddAttendance = () => {
    setAttendanceForm(emptyAttendanceForm);
    setAttendanceModalOpen(true);
  };

  const handleSaveAttendance = async () => {
    const emp = employees.find((e) => e.id === attendanceForm.employeeId);
    if (!emp) return;
    await addAttendance({
      employeeId: emp.id,
      employeeName: emp.name,
      date: new Date(attendanceForm.date).toISOString(),
      checkIn: attendanceForm.checkIn,
      checkOut: attendanceForm.checkOut || undefined,
      status: attendanceForm.status,
    });
    setAttendanceModalOpen(false);
  };

  const togglePayStatus = (employeeId: string) => {
    setPaidStatus((prev) => ({ ...prev, [employeeId]: !prev[employeeId] }));
  };

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'employees', label: 'Employees', icon: <Users className="w-4 h-4" /> },
    { key: 'attendance', label: 'Attendance', icon: <Clock className="w-4 h-4" /> },
    { key: 'salary', label: 'Salary Records', icon: <DollarSign className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary-600/10 border border-primary-600/20">
          <Users className="w-6 h-6 text-primary-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Employee Management</h1>
          <p className="text-sm text-dark-400">Manage employees, attendance & payroll</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 glass rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                : 'text-dark-300 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== EMPLOYEES TAB ===== */}
      {activeTab === 'employees' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-light rounded-2xl p-5 animate-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-300 mb-1">Total Employees</p>
                  <p className="text-2xl font-bold text-primary-500">{employeeStats.total}</p>
                </div>
                <div className="text-primary-500 opacity-50"><Users className="w-7 h-7" /></div>
              </div>
            </div>
            <div className="glass-light rounded-2xl p-5 animate-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-300 mb-1">Active</p>
                  <p className="text-2xl font-bold text-success-400">{employeeStats.active}</p>
                </div>
                <div className="text-success-400 opacity-50"><UserCheck className="w-7 h-7" /></div>
              </div>
            </div>
            <div className="glass-light rounded-2xl p-5 animate-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-300 mb-1">Inactive</p>
                  <p className="text-2xl font-bold text-dark-300">{employeeStats.inactive}</p>
                </div>
                <div className="text-dark-300 opacity-50"><UserX className="w-7 h-7" /></div>
              </div>
            </div>
            <div className="glass-light rounded-2xl p-5 animate-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-300 mb-1">Monthly Payroll</p>
                  <p className="text-2xl font-bold text-warning-400">{formatLKR(employeeStats.payroll)}</p>
                </div>
                <div className="text-warning-400 opacity-50"><DollarSign className="w-7 h-7" /></div>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={openAddEmployee} size="sm">
              <Plus className="w-4 h-4" />
              Add Employee
            </Button>
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
          </div>

          {/* Employee Cards Grid */}
          {filteredEmployees.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center text-dark-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No employees found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="glass rounded-xl p-5 hover:border-white/10 transition-all duration-200 group"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-600/10 border border-primary-600/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary-500" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white truncate">{emp.name}</h3>
                        <Badge variant={roleBadgeVariant[emp.role]}>
                          {emp.role.charAt(0).toUpperCase() + emp.role.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-400">Email</span>
                      <span className="text-dark-200 truncate ml-2">{emp.email}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-400">Phone</span>
                      <span className="text-white font-medium">{emp.phone}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-400">Salary</span>
                      <span className="text-warning-400 font-medium">{formatLKR(emp.salary)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-400">Status</span>
                      {emp.active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="danger">Inactive</Badge>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                    <button
                      onClick={() => openEditEmployee(emp.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-dark-300 hover:text-info-400 hover:bg-info-500/10 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add/Edit Employee Modal */}
          <Modal
            isOpen={employeeModalOpen}
            onClose={() => setEmployeeModalOpen(false)}
            title={editingEmployeeId ? 'Edit Employee' : 'Add Employee'}
            size="lg"
          >
            <div className="space-y-4">
              <Input
                label="Name"
                value={employeeForm.name}
                onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                placeholder="Enter employee name"
                icon={<Users className="w-4 h-4" />}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email"
                  type="email"
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                  placeholder="employee@email.com"
                />
                <Input
                  label="Phone"
                  value={employeeForm.phone}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                  placeholder="0771234567"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Role"
                  options={roleOptions}
                  value={employeeForm.role}
                  onChange={(e) =>
                    setEmployeeForm({
                      ...employeeForm,
                      role: e.target.value as EmployeeForm['role'],
                    })
                  }
                />
                <Input
                  label="Salary"
                  type="number"
                  value={employeeForm.salary}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, salary: e.target.value })}
                  placeholder="0.00"
                  icon={<DollarSign className="w-4 h-4" />}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-dark-300">Active</label>
                <button
                  type="button"
                  onClick={() => setEmployeeForm({ ...employeeForm, active: !employeeForm.active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    employeeForm.active ? 'bg-primary-600' : 'bg-dark-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      employeeForm.active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setEmployeeModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEmployee} disabled={!employeeForm.name}>
                  {editingEmployeeId ? 'Update Employee' : 'Add Employee'}
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* ===== ATTENDANCE TAB ===== */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="glass rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[180px]">
                <Input
                  label="Date"
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  icon={<Calendar className="w-4 h-4" />}
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <Select
                  label="Employee"
                  options={[{ value: '', label: 'Select Employee' }, ...employeeOptions]}
                  value={attendanceEmployeeId}
                  onChange={(e) => setAttendanceEmployeeId(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2 pt-5">
                <Button
                  size="sm"
                  onClick={handleCheckIn}
                  disabled={!attendanceEmployeeId}
                >
                  <Clock className="w-4 h-4" />
                  Check In
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCheckOut}
                  disabled={!attendanceEmployeeId}
                >
                  <Clock className="w-4 h-4" />
                  Check Out
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openAddAttendance}
                >
                  <Plus className="w-4 h-4" />
                  Add Record
                </Button>
              </div>
            </div>
          </div>

          {/* Attendance Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-light rounded-2xl p-5 animate-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-300 mb-1">Present</p>
                  <p className="text-2xl font-bold text-success-400">{attendanceStats.present}</p>
                </div>
                <div className="text-success-400 opacity-50"><UserCheck className="w-7 h-7" /></div>
              </div>
            </div>
            <div className="glass-light rounded-2xl p-5 animate-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-300 mb-1">Late</p>
                  <p className="text-2xl font-bold text-warning-400">{attendanceStats.late}</p>
                </div>
                <div className="text-warning-400 opacity-50"><Clock className="w-7 h-7" /></div>
              </div>
            </div>
            <div className="glass-light rounded-2xl p-5 animate-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-300 mb-1">Half Day</p>
                  <p className="text-2xl font-bold text-info-400">{attendanceStats.halfDay}</p>
                </div>
                <div className="text-info-400 opacity-50"><Clock className="w-7 h-7" /></div>
              </div>
            </div>
            <div className="glass-light rounded-2xl p-5 animate-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-300 mb-1">Absent</p>
                  <p className="text-2xl font-bold text-primary-500">{attendanceStats.absent}</p>
                </div>
                <div className="text-primary-500 opacity-50"><UserX className="w-7 h-7" /></div>
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          {attendanceRecords.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center text-dark-400">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No attendance records for this date</p>
            </div>
          ) : (
            <div className="glass rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-4 py-3 text-left text-dark-400 font-medium">Employee</th>
                      <th className="px-4 py-3 text-left text-dark-400 font-medium">Date</th>
                      <th className="px-4 py-3 text-left text-dark-400 font-medium">Check In</th>
                      <th className="px-4 py-3 text-left text-dark-400 font-medium">Check Out</th>
                      <th className="px-4 py-3 text-left text-dark-400 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map((record) => (
                      <tr
                        key={record.id}
                        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-4 py-3 text-white font-medium">{record.employeeName}</td>
                        <td className="px-4 py-3 text-dark-300">{formatDate(record.date)}</td>
                        <td className="px-4 py-3 text-dark-300">
                          {record.checkIn || '--'}
                        </td>
                        <td className="px-4 py-3 text-dark-300">
                          {record.checkOut || '--'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={attendanceStatusBadge[record.status]}>
                            {record.status === 'half-day'
                              ? 'Half Day'
                              : record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Add Attendance Modal */}
          <Modal
            isOpen={attendanceModalOpen}
            onClose={() => setAttendanceModalOpen(false)}
            title="Add Attendance Record"
            size="lg"
          >
            <div className="space-y-4">
              <Select
                label="Employee"
                options={[{ value: '', label: 'Select Employee' }, ...employeeOptions]}
                value={attendanceForm.employeeId}
                onChange={(e) =>
                  setAttendanceForm({ ...attendanceForm, employeeId: e.target.value })
                }
              />
              <Input
                label="Date"
                type="date"
                value={attendanceForm.date}
                onChange={(e) =>
                  setAttendanceForm({ ...attendanceForm, date: e.target.value })
                }
                icon={<Calendar className="w-4 h-4" />}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Check In Time"
                  type="time"
                  value={attendanceForm.checkIn}
                  onChange={(e) =>
                    setAttendanceForm({ ...attendanceForm, checkIn: e.target.value })
                  }
                />
                <Input
                  label="Check Out Time"
                  type="time"
                  value={attendanceForm.checkOut}
                  onChange={(e) =>
                    setAttendanceForm({ ...attendanceForm, checkOut: e.target.value })
                  }
                />
              </div>
              <Select
                label="Status"
                options={statusOptions}
                value={attendanceForm.status}
                onChange={(e) =>
                  setAttendanceForm({
                    ...attendanceForm,
                    status: e.target.value as AttendanceForm['status'],
                  })
                }
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setAttendanceModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveAttendance} disabled={!attendanceForm.employeeId}>
                  Add Record
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* ===== SALARY TAB ===== */}
      {activeTab === 'salary' && (
        <div className="space-y-6">
          {/* Month Picker */}
          <div className="max-w-[220px]">
            <Input
              label="Month"
              type="month"
              value={salaryMonth}
              onChange={(e) => setSalaryMonth(e.target.value)}
              icon={<Calendar className="w-4 h-4" />}
            />
          </div>

          {/* Salary Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-light rounded-2xl p-5 animate-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-300 mb-1">Total Base Salary</p>
                  <p className="text-2xl font-bold text-white">{formatLKR(salaryData.totalBaseSalary)}</p>
                </div>
                <div className="text-white opacity-50"><DollarSign className="w-7 h-7" /></div>
              </div>
            </div>
            <div className="glass-light rounded-2xl p-5 animate-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-300 mb-1">Total Deductions</p>
                  <p className="text-2xl font-bold text-primary-500">{formatLKR(salaryData.totalDeductions)}</p>
                </div>
                <div className="text-primary-500 opacity-50"><DollarSign className="w-7 h-7" /></div>
              </div>
            </div>
            <div className="glass-light rounded-2xl p-5 animate-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-300 mb-1">Net Payroll</p>
                  <p className="text-2xl font-bold text-success-400">{formatLKR(salaryData.netPayroll)}</p>
                </div>
                <div className="text-success-400 opacity-50"><DollarSign className="w-7 h-7" /></div>
              </div>
            </div>
          </div>

          {/* Salary Table */}
          {salaryData.rows.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center text-dark-400">
              <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No salary data available</p>
            </div>
          ) : (
            <div className="glass rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-4 py-3 text-left text-dark-400 font-medium">Employee</th>
                      <th className="px-4 py-3 text-left text-dark-400 font-medium">Role</th>
                      <th className="px-4 py-3 text-right text-dark-400 font-medium">Base Salary</th>
                      <th className="px-4 py-3 text-right text-dark-400 font-medium">Deductions</th>
                      <th className="px-4 py-3 text-right text-dark-400 font-medium">Net Salary</th>
                      <th className="px-4 py-3 text-center text-dark-400 font-medium">Status</th>
                      <th className="px-4 py-3 text-center text-dark-400 font-medium">Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryData.rows.map((row) => (
                      <tr
                        key={row.employee.id}
                        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-4 py-3 text-white font-medium">{row.employee.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant={roleBadgeVariant[row.employee.role]}>
                            {row.employee.role.charAt(0).toUpperCase() + row.employee.role.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-dark-200">{formatLKR(row.baseSalary)}</td>
                        <td className="px-4 py-3 text-right text-primary-400">{formatLKR(row.deductions)}</td>
                        <td className="px-4 py-3 text-right text-white font-medium">{formatLKR(row.netSalary)}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={row.isPaid ? 'success' : 'warning'}>
                            {row.isPaid ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => togglePayStatus(row.employee.id)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                              row.isPaid ? 'bg-success-500' : 'bg-dark-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                row.isPaid ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
