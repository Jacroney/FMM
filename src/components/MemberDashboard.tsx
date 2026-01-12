import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  User,
  CreditCard,
  Clock,
  Lock,
  Mail,
  RefreshCw,
  HelpCircle,
  DollarSign,
  GraduationCap,
  BookOpen,
  Award,
  Phone,
  ArrowRight,
  LogOut,
  Pencil,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MemberDuesInfo } from '../services/authService';
import { DuesService } from '../services/duesService';
import { InstallmentService } from '../services/installmentService';
import { MemberDuesSummary, InstallmentPlanWithPayments } from '../services/types';
import ProfileEditModal from './ProfileEditModal';
import PaymentHistoryModal from './PaymentHistoryModal';
import PasswordChangeModal from './PasswordChangeModal';
import PayDuesButton from './PayDuesButton';
import { getYearLabel } from '../utils/yearUtils';
import CircularProgress from './CircularProgress';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const getInitials = (name: string | undefined): string => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getFirstName = (name: string | undefined): string => {
  if (!name) return 'Member';
  const parts = name.trim().split(' ');
  return parts[0] || 'Member';
};

export const MemberDashboard: React.FC = () => {
  const { profile, getMemberDues, signOut } = useAuth();
  const [duesInfo, setDuesInfo] = useState<MemberDuesInfo | null>(null);
  const [memberDuesSummary, setMemberDuesSummary] = useState<MemberDuesSummary[]>([]);
  const [installmentPlans, setInstallmentPlans] = useState<InstallmentPlanWithPayments[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPaymentHistoryModalOpen, setIsPaymentHistoryModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void loadDuesInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDuesInfo = async () => {
    try {
      setIsLoading(true);
      setRefreshKey(prev => prev + 1); // Trigger re-check of pending payments
      const info = await getMemberDues();
      setDuesInfo(info);

      // Also fetch detailed dues summary for payment button
      if (profile?.email) {
        const summary = await DuesService.getMemberDuesSummaryByEmail(profile.email);
        setMemberDuesSummary(summary);

        // Fetch installment plans for each dues item
        const plans: InstallmentPlanWithPayments[] = [];
        for (const dues of summary) {
          try {
            // First get the active plan by member_dues_id
            const activePlan = await InstallmentService.getActivePlan(dues.id);
            if (activePlan) {
              // Then get the full plan with payments using the plan's id
              const planWithPayments = await InstallmentService.getPlanWithPayments(activePlan.id);
              if (planWithPayments) {
                plans.push(planWithPayments);
              }
            }
          } catch {
            // No plan for this dues - that's ok
          }
        }
        setInstallmentPlans(plans);
      }
    } catch (error) {
      console.error('Error loading dues info:', error);
      toast.error('Unable to load dues information right now.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--brand-surface)] dark:bg-gray-900">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
          Loading your dashboard...
        </div>
      </div>
    );
  }

  const duesBalance = duesInfo?.dues_balance ?? profile?.dues_balance ?? 0;
  const isOwed = duesBalance > 0;
  const chapterName = duesInfo?.chapter_name || 'Your Chapter';

  // Calculate profile completeness
  const profileFields = {
    full_name: profile?.full_name,
    email: profile?.email,
    phone_number: profile?.phone_number,
    year: profile?.year,
    major: profile?.major,
  };
  const filledFields = Object.values(profileFields).filter(v => v && v !== profile?.email).length;
  const totalFields = Object.keys(profileFields).length - 1; // Exclude email as it's always present
  const profileCompleteness = Math.round((filledFields / totalFields) * 100);
  const isProfileIncomplete = profileCompleteness < 75;

  return (
    <div className="min-h-screen bg-[var(--brand-surface)] dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--brand-border)] bg-white/80 backdrop-blur-xl dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/GreekPay-logo-transparent.png"
              alt="GreekPay Logo"
              className="h-9 w-auto dark:invert"
            />
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Member Portal</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Hero Welcome Card */}
          <div className="surface-card overflow-hidden">
            <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-800 dark:via-gray-800 dark:to-indigo-900/20 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex items-center gap-4 sm:gap-5">
                  {/* Avatar with initials */}
                  <div className="relative flex-shrink-0">
                    <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl sm:text-2xl font-bold shadow-lg">
                      {getInitials(profile?.full_name)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-[3px] border-white dark:border-gray-800" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                      Welcome back, {getFirstName(profile?.full_name)}!
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      {chapterName}
                    </p>
                  </div>
                </div>
                {/* Profile completeness indicator - hidden when 100% */}
                {profileCompleteness < 100 && (
                  <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                    <CircularProgress
                      percentage={profileCompleteness}
                      size={56}
                      strokeWidth={5}
                      color={profileCompleteness < 50 ? 'yellow' : profileCompleteness < 75 ? 'blue' : 'green'}
                      showPercentage={true}
                      label="Profile"
                    />
                    {isProfileIncomplete && (
                      <button
                        onClick={() => setIsProfileModalOpen(true)}
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
                      >
                        Complete profile <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dues Balance Card */}
          <div className="surface-card overflow-hidden transition-all duration-200 hover:shadow-lg">
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                    isOwed ? 'bg-rose-100 dark:bg-rose-900/40' : 'bg-emerald-100 dark:bg-emerald-900/40'
                  }`}>
                    <DollarSign className={`h-7 w-7 ${isOwed ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Dues Balance</p>
                    <p className={`text-3xl sm:text-4xl font-bold tracking-tight ${
                      isOwed ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {formatCurrency(Math.abs(duesBalance))}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  isOwed
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                }`}>
                  {isOwed ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                      Payment Due
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Paid in Full
                    </>
                  )}
                </span>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400">
                {isOwed ? 'Amount owed for the current term' : duesBalance === 0 ? 'Your balance is paid in full - thank you!' : 'You have a credit balance'}
              </p>

              {/* Flexible Payment Plan Info */}
              {memberDuesSummary.some(dues => dues.flexible_plan_deadline) && (
                <div className="mt-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/50">
                      <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-900 dark:text-purple-100">Flexible Payment Plan</h4>
                      {memberDuesSummary.filter(dues => dues.flexible_plan_deadline).map(dues => {
                        const deadline = new Date(dues.flexible_plan_deadline!);
                        const today = new Date();
                        const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        const weeksRemaining = Math.max(1, Math.ceil(daysRemaining / 7));
                        const suggestedWeekly = dues.balance / weeksRemaining;

                        return (
                          <div key={dues.id} className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                            <p>
                              Deadline: {deadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                              {daysRemaining > 0 && (
                                <span className="ml-2 text-purple-500">({daysRemaining} days remaining)</span>
                              )}
                            </p>
                            {daysRemaining > 0 && dues.balance > 0 && (
                              <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">
                                Suggested: ~{formatCurrency(suggestedWeekly)}/week to pay off on time
                              </p>
                            )}
                            {dues.flexible_plan_notes && (
                              <p className="mt-1 text-xs italic">{dues.flexible_plan_notes}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {isOwed && (
                <div className="mt-6 pt-6 border-t border-[var(--brand-border)] space-y-4">
                  <div className="rounded-xl bg-slate-50 dark:bg-gray-700/50 p-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-slate-500" />
                      Payment Options
                    </h3>
                    <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                      <li className="flex items-start gap-3">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                        <span>Pay online using the button below</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                        <span></span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                        <span>Include your full name in payment description</span>
                      </li>
                    </ul>
                  </div>
                  {memberDuesSummary.length > 0 ? (
                    <div className="space-y-2">
                      {memberDuesSummary.map((dues) => (
                        <PayDuesButton
                          key={dues.id}
                          memberDues={dues}
                          onPaymentSuccess={loadDuesInfo}
                          refreshKey={refreshKey}
                          variant="primary"
                          className="w-full"
                        />
                      ))}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const email = 'joseph@greekpay.org';
                        const subject = 'Question about dues';
                        const body = `Hi,\n\nI have a question about my dues balance.\n\nBest regards,\n${profile?.full_name || ''}`;
                        window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                      }}
                      className="focus-ring w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 active:scale-[0.98] dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      Contact Treasurer for Payment Options
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Active Installment Plans */}
          {installmentPlans.length > 0 && (
            <div className="space-y-4">
              {installmentPlans.map((plan) => {
                const completedPayments = plan.payments.filter(p => p.status === 'succeeded').length;
                const progressPercentage = (completedPayments / plan.num_installments) * 100;
                const nextPayment = plan.payments.find(p => p.status === 'scheduled');

                return (
                  <div key={plan.id} className="surface-card overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
                            <Calendar className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">Payment Plan Active</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {plan.num_installments} payments of {formatCurrency(plan.installment_amount)}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          plan.status === 'active'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            : plan.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                        }`}>
                          {plan.status === 'active' ? 'Active' : plan.status === 'completed' ? 'Completed' : 'Cancelled'}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-slate-600 dark:text-slate-400">Progress</span>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {completedPayments} of {plan.num_installments} payments
                          </span>
                        </div>
                        <div className="h-2.5 bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Payment Schedule */}
                      <div className="space-y-2">
                        {plan.payments.map((payment, idx) => (
                          <div
                            key={payment.id}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              payment.status === 'succeeded'
                                ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                : payment.status === 'scheduled'
                                ? 'bg-slate-50 dark:bg-gray-700/50'
                                : payment.status === 'failed'
                                ? 'bg-rose-50 dark:bg-rose-900/20'
                                : 'bg-yellow-50 dark:bg-yellow-900/20'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                payment.status === 'succeeded'
                                  ? 'bg-emerald-500 text-white'
                                  : payment.status === 'scheduled'
                                  ? 'bg-slate-300 dark:bg-gray-600 text-slate-600 dark:text-slate-300'
                                  : payment.status === 'failed'
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-yellow-500 text-white'
                              }`}>
                                {payment.status === 'succeeded' ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <span className="text-sm font-medium">{idx + 1}</span>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                  Payment {idx + 1}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {payment.status === 'succeeded' && payment.processed_at
                                    ? `Paid ${new Date(payment.processed_at).toLocaleDateString()}`
                                    : `Due ${new Date(payment.scheduled_date).toLocaleDateString()}`
                                  }
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {formatCurrency(payment.amount)}
                              </p>
                              <p className={`text-xs ${
                                payment.status === 'succeeded'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : payment.status === 'failed'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-slate-500 dark:text-slate-400'
                              }`}>
                                {payment.status === 'succeeded' ? 'Paid'
                                  : payment.status === 'failed' ? 'Failed'
                                  : payment.status === 'processing' ? 'Processing'
                                  : 'Scheduled'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Next Payment Info */}
                      {nextPayment && plan.status === 'active' && (
                        <div className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                          <div className="flex items-start gap-3">
                            <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                Next payment: {formatCurrency(nextPayment.amount)}
                              </p>
                              <p className="text-xs text-blue-600 dark:text-blue-300">
                                Scheduled for {new Date(nextPayment.scheduled_date).toLocaleDateString()}
                                {plan.payment_method_type && ` via ${plan.payment_method_type === 'card' ? 'Card' : 'Bank Transfer'}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Completion Message */}
                      {plan.status === 'completed' && (
                        <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                              Payment plan completed! Thank you for your payments.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Grid Layout for Info and Actions */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Member Information */}
            <div className="surface-card p-4 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Member Information</h2>
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-gray-700/50">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-gray-800 shadow-sm flex-shrink-0">
                    <Mail className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{profile?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-gray-700/50">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-gray-800 shadow-sm flex-shrink-0">
                    <GraduationCap className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Year</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{profile?.year ? getYearLabel(profile.year) : 'Not specified'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-gray-700/50">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-gray-800 shadow-sm flex-shrink-0">
                    <BookOpen className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Major</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{profile?.major || 'Not specified'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-gray-700/50">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-gray-800 shadow-sm flex-shrink-0">
                    <Award className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Position</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{profile?.position || 'Member'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-gray-700/50">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-gray-800 shadow-sm flex-shrink-0">
                    <Phone className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Phone</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{profile?.phone_number || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="surface-card p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-5">Quick Actions</h2>
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="focus-ring group flex flex-col items-center gap-3 rounded-xl border border-[var(--brand-border)] bg-white p-4 text-center transition-all duration-200 hover:bg-slate-50 hover:border-blue-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:border-blue-700/50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform duration-200 dark:bg-blue-900/40 dark:text-blue-400">
                    <User className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Edit Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPaymentHistoryModalOpen(true)}
                  className="focus-ring group flex flex-col items-center gap-3 rounded-xl border border-[var(--brand-border)] bg-white p-4 text-center transition-all duration-200 hover:bg-slate-50 hover:border-purple-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:border-purple-700/50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform duration-200 dark:bg-purple-900/40 dark:text-purple-400">
                    <Clock className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">History</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="focus-ring group flex flex-col items-center gap-3 rounded-xl border border-[var(--brand-border)] bg-white p-4 text-center transition-all duration-200 hover:bg-slate-50 hover:border-amber-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:border-amber-700/50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform duration-200 dark:bg-amber-900/40 dark:text-amber-400">
                    <Lock className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Security</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const email = 'joseph@greekpay.org';
                    const subject = 'Question about dues';
                    const body = `Hi,\n\nI have a question about my dues balance.\n\nBest regards,\n${profile?.full_name || ''}`;
                    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                  }}
                  className="focus-ring group flex flex-col items-center gap-3 rounded-xl border border-[var(--brand-border)] bg-white p-4 text-center transition-all duration-200 hover:bg-slate-50 hover:border-emerald-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:border-emerald-700/50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform duration-200 dark:bg-emerald-900/40 dark:text-emerald-400">
                    <Mail className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Contact</span>
                </button>

                <button
                  type="button"
                  onClick={loadDuesInfo}
                  className="focus-ring group flex flex-col items-center gap-3 rounded-xl border border-[var(--brand-border)] bg-white p-4 text-center transition-all duration-200 hover:bg-slate-50 hover:border-cyan-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:border-cyan-700/50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 group-hover:scale-110 transition-transform duration-200 dark:bg-cyan-900/40 dark:text-cyan-400">
                    <RefreshCw className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Refresh</span>
                </button>

                <button
                  type="button"
                  onClick={signOut}
                  className="focus-ring group flex flex-col items-center gap-3 rounded-xl border border-[var(--brand-border)] bg-white p-4 text-center transition-all duration-200 hover:bg-slate-50 hover:border-rose-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:border-rose-700/50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform duration-200 dark:bg-rose-900/40 dark:text-rose-400">
                    <LogOut className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="surface-card p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex-shrink-0">
                <HelpCircle className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Need Help?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Questions about your dues or account? We're here to help.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <a
                    href="mailto:joseph@greekpay.org"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
                  >
                    <Mail className="h-4 w-4" />
                    Email Treasurer
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsPaymentHistoryModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors dark:bg-gray-700 dark:text-slate-300 dark:hover:bg-gray-600"
                  >
                    <Clock className="h-4 w-4" />
                    View History
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSuccess={loadDuesInfo}
      />

      <PaymentHistoryModal
        isOpen={isPaymentHistoryModalOpen}
        onClose={() => setIsPaymentHistoryModalOpen(false)}
      />

      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};
