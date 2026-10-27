import React, { useState } from 'react';
import { 
  Wallet, 
  PieChart, 
  Plus, 
  ArrowUpRight, 
  Receipt, 
  Users, 
  Bed, 
  UtensilsCrossed, 
  Car, 
  Compass, 
  Coins, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Upload,
  QrCode,
  Check,
  X,
  Maximize2,
  ExternalLink,
  Edit3,
  Copy,
  CheckCheck,
  ShieldCheck
} from 'lucide-react';
import { useTrip } from '../../context/TripContext';
import { useAuth } from '../../context/AuthContext';
import { createUpiQrSvg } from '../../utils/qrHelper';

export const BudgetDashboard = () => {
  const { trip, budgetSummary, addExpense, setTrip, settleDebt, setIsInviteModalOpen } = useTrip();
  const { formatPrice, currentUser, availableUsers } = useAuth();

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isTargetBudgetModalOpen, setIsTargetBudgetModalOpen] = useState(false);
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [activeReceiptModal, setActiveReceiptModal] = useState(null);
  const [isCopiedUpi, setIsCopiedUpi] = useState(false);
  const [paymentProofImage, setPaymentProofImage] = useState(null);
  const [paymentTxnId, setPaymentTxnId] = useState('');

  // New Expense Form State
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('food');
  const [expensePaidBy, setExpensePaidBy] = useState(currentUser?.name || 'Alex Morgan');
  const [expenseType, setExpenseType] = useState('actual');
  const [expenseReceipt, setExpenseReceipt] = useState(null);
  const [expenseSplitMode, setExpenseSplitMode] = useState('equal'); // 'equal' | 'weighted'
  const [selectedSplitMembers, setSelectedSplitMembers] = useState(
    trip?.members?.map(m => m.name) || []
  );
  const [customWeights, setCustomWeights] = useState({});
  const [splitValidationError, setSplitValidationError] = useState('');

  // Target Budget Form State
  const [newTargetBudget, setNewTargetBudget] = useState(trip?.budget?.totalTarget || 40000);

  const handleToggleMember = (name) => {
    let nextList;
    if (selectedSplitMembers.includes(name)) {
      if (selectedSplitMembers.length <= 1) {
        setSplitValidationError('An expense must have at least one participating traveler.');
        return;
      }
      nextList = selectedSplitMembers.filter(m => m !== name);
    } else {
      nextList = [...selectedSplitMembers, name];
    }
    setSelectedSplitMembers(nextList);
    setSplitValidationError('');

    const n = Math.max(nextList.length, 1);
    const basePct = Math.floor(100 / n);
    const rem = 100 % n;
    const nextWeights = {};
    nextList.forEach((mName, i) => {
      nextWeights[mName] = basePct + (i < rem ? 1 : 0);
    });
    setCustomWeights(nextWeights);
  };

  const handleWeightChange = (name, val) => {
    const num = Math.max(0, Math.min(100, Number(val) || 0));
    setCustomWeights(prev => ({ ...prev, [name]: num }));
    setSplitValidationError('');
  };

  const totalCustomWeight = selectedSplitMembers.reduce(
    (sum, name) => sum + (Number(customWeights[name]) || 0),
    0
  );

  if (!budgetSummary) return null;

  const {
    totalTarget = 40000,
    totalEstimated = 0,
    actualLogged = 0,
    remaining = 0,
    perPersonTarget = 10000,
    perPersonEstimated = 0,
    categories = {},
    splitMode = 'equal',
    memberBalances = [],
    optimalSettlements = [],
  } = budgetSummary;

  const isOverBudget = remaining < 0;

  const categoryIcons = {
    accommodation: <Bed className="w-4 h-4 text-purple-600" />,
    food: <UtensilsCrossed className="w-4 h-4 text-amber-600" />,
    transport: <Car className="w-4 h-4 text-sky-600" />,
    activities: <Compass className="w-4 h-4 text-emerald-600" />,
    other: <Coins className="w-4 h-4 text-slate-600" />,
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setExpenseReceipt(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaymentProofUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProofImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateExpense = (e) => {
    e.preventDefault();
    if (!expenseTitle.trim()) {
      setSplitValidationError('Please provide an expense description.');
      return;
    }
    const numAmount = Number(expenseAmount);
    if (!numAmount || numAmount <= 0) {
      setSplitValidationError('Please provide an expense amount greater than 0.');
      return;
    }
    if (selectedSplitMembers.length === 0) {
      setSplitValidationError('Please select at least one traveler sharing this expense.');
      return;
    }
    if (expenseSplitMode === 'weighted') {
      if (totalCustomWeight !== 100) {
        setSplitValidationError(`Custom weights must sum exactly to 100% (currently ${totalCustomWeight}%).`);
        return;
      }
    }

    addExpense({
      title: expenseTitle.trim(),
      amount: numAmount,
      category: expenseCategory,
      paidBy: expensePaidBy,
      splitMode: expenseSplitMode,
      splitWith: selectedSplitMembers,
      splits: expenseSplitMode === 'weighted' ? customWeights : {},
      type: expenseType,
      receiptUrl: expenseReceipt,
    });

    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseReceipt(null);
    setSplitValidationError('');
    setIsExpenseModalOpen(false);
  };

  const handleSaveTargetBudget = (e) => {
    e.preventDefault();
    const target = Number(newTargetBudget);
    if (!target || target <= 0) return;

    setTrip(prev => ({
      ...prev,
      budget: {
        ...prev.budget,
        totalTarget: target,
      }
    }));
    setIsTargetBudgetModalOpen(false);
  };

  const toggleSplitMode = (mode) => {
    setTrip(prev => ({
      ...prev,
      budget: { ...prev.budget, splitMode: mode }
    }));
  };

  return (
    <div className="space-y-8">
      
      {/* Overview Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Target Budget */}
        <div className="bg-white p-5 rounded-3xl border border-brand-sand-border shadow-subtle space-y-1 relative group">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-brand-navy/60 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-brand-navy" />
              <span>Target Trip Budget</span>
            </div>
            <button
              onClick={() => setIsTargetBudgetModalOpen(true)}
              className="text-[10px] text-brand-orange hover:underline font-bold flex items-center gap-1 opacity-80 group-hover:opacity-100"
              title="Edit Target Budget"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>
          <div className="text-2xl font-bold text-brand-navy">
            {formatPrice(totalTarget)}
          </div>
          <div className="text-xs text-brand-navy/60">
            {formatPrice(perPersonTarget)} / person ({trip.members.length} members)
          </div>
        </div>

        {/* Estimated Itinerary Total */}
        <div className="bg-white p-5 rounded-3xl border border-brand-sand-border shadow-subtle space-y-1">
          <div className="text-xs font-semibold text-brand-navy/60 uppercase tracking-wider flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5 text-brand-orange" />
            <span>Estimated Itinerary</span>
          </div>
          <div className="text-2xl font-bold text-brand-orange">
            {formatPrice(totalEstimated)}
          </div>
          <div className="text-xs text-brand-navy/60">
            {formatPrice(perPersonEstimated)} / person projected
          </div>
        </div>

        {/* Actual Paid Out */}
        <div className="bg-white p-5 rounded-3xl border border-brand-sand-border shadow-subtle space-y-1">
          <div className="text-xs font-semibold text-brand-navy/60 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-brand-teal" />
            <span>Actual Paid to Date</span>
          </div>
          <div className="text-2xl font-bold text-brand-teal">
            {formatPrice(actualLogged)}
          </div>
          <div className="text-xs text-brand-navy/60">
            {(trip.budget.expenses || []).length} logged expenses
          </div>
        </div>

        {/* Remaining Budget Cushion */}
        <div className={`p-5 rounded-3xl border shadow-subtle space-y-1 ${
          isOverBudget ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
        }`}>
          <div className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
            {isOverBudget ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span className={isOverBudget ? 'text-rose-700' : 'text-emerald-700'}>
              {isOverBudget ? 'Budget Overrun' : 'Remaining Cushion'}
            </span>
          </div>
          <div className={`text-2xl font-bold ${isOverBudget ? 'text-rose-700' : 'text-emerald-700'}`}>
            {formatPrice(Math.abs(remaining))}
          </div>
          <div className={`text-xs ${isOverBudget ? 'text-rose-600' : 'text-emerald-600'}`}>
            {isOverBudget ? 'Exceeds target limit' : 'Under ceiling'}
          </div>
        </div>

      </div>

      {/* Category Progress Bars */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-sand-border shadow-subtle space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg text-brand-navy">
              Budget Allocation by Category
            </h3>
            <p className="text-xs text-brand-navy/60">
              Deterministic calculations based on current stays, dining and activities.
            </p>
          </div>

          {/* Equal vs Weighted Split Pill */}
          <div className="flex flex-col sm:inline-flex sm:flex-row p-1 rounded-2xl sm:rounded-full bg-brand-sand border border-brand-sand-border gap-1 sm:gap-0">
            <button
              onClick={() => toggleSplitMode('equal')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                splitMode === 'equal'
                  ? 'bg-brand-navy text-white shadow-sm'
                  : 'text-brand-navy/70 hover:text-brand-navy'
              }`}
            >
              Equal Split ({Math.round(100 / (trip.members.length || 4))}% each)
            </button>
            <button
              onClick={() => toggleSplitMode('weighted')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                splitMode === 'weighted'
                  ? 'bg-brand-navy text-white shadow-sm'
                  : 'text-brand-navy/70 hover:text-brand-navy'
              }`}
            >
              Custom Weighted Split
            </button>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(categories).map(([catKey, amount]) => {
            const pct = Math.round((amount / (totalEstimated || 1)) * 100);
            return (
              <div key={catKey} className="bg-brand-sand/50 p-4 rounded-2xl border border-brand-sand-border/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {categoryIcons[catKey] || <Coins className="w-4 h-4" />}
                    <span className="capitalize font-semibold text-xs text-brand-navy">
                      {catKey}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-brand-navy">
                    {formatPrice(amount)} <span className="text-brand-navy/50 font-normal">({pct}%)</span>
                  </div>
                </div>
                <div className="w-full bg-brand-sand-border rounded-full h-2">
                  <div
                    className="bg-brand-teal h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CORE FEATURE: WHO PAYS WHOM (OPTIMAL DEBT SETTLEMENT MATRIX) */}
      <div className="bg-gradient-to-br from-brand-sand/70 via-white to-brand-sand/40 rounded-3xl p-6 sm:p-8 border border-brand-sand-border shadow-subtle space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-orange/10 text-brand-orange text-xs font-bold mb-1.5">
              <Coins className="w-3.5 h-3.5" />
              <span>Smart Debt Settlement Matrix</span>
            </div>
            <h3 className="font-bold text-lg text-brand-navy">
              Who Pays Whom · Minimum Cash Flow Settle-Up
            </h3>
            <p className="text-xs text-brand-navy/60">
              Simplifies multi-member group debts into the absolute minimum number of direct payments.
            </p>
          </div>

          <div className="text-xs text-brand-navy/70 bg-white px-3.5 py-1.5 rounded-2xl border border-brand-sand-border">
            Fair Share per person: <strong className="text-brand-teal">{formatPrice(Math.round(actualLogged / (trip.members.length || 4)))}</strong>
          </div>
        </div>

        {optimalSettlements.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-brand-sand-border/80 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="font-bold text-sm text-brand-navy">All group balances are settled!</h4>
            <p className="text-xs text-brand-navy/60">No pending payments between any trip members right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {optimalSettlements.map((stl) => {
              const isPayerMe = stl.from === currentUser?.name;
              const isReceiverMe = stl.to === currentUser?.name;

              return (
                <div
                  key={stl.id}
                  className="bg-white p-4 rounded-2xl border border-brand-sand-border shadow-subtle space-y-3 hover:border-brand-orange/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    {/* Debtor */}
                    <div className="flex items-center gap-2">
                      <img
                        src={stl.fromAvatar}
                        alt={stl.from}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-rose-200"
                      />
                      <div>
                        <div className="font-bold text-xs text-brand-navy">
                          {stl.from} {isPayerMe && <span className="text-[10px] text-brand-orange">(You)</span>}
                        </div>
                        <div className="text-[10px] text-rose-600 font-semibold">Owes</div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center px-3">
                      <span className="text-xs font-bold text-brand-orange">
                        {formatPrice(stl.amount)}
                      </span>
                      <ArrowRight className="w-4 h-4 text-brand-navy/40" />
                    </div>

                    {/* Creditor */}
                    <div className="flex items-center gap-2 text-right">
                      <div>
                        <div className="font-bold text-xs text-brand-navy">
                          {stl.to} {isReceiverMe && <span className="text-[10px] text-brand-teal">(You)</span>}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-semibold">Receives</div>
                      </div>
                      <img
                        src={stl.toAvatar}
                        alt={stl.to}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-200"
                      />
                    </div>
                  </div>

                  {/* Settlement Actions */}
                  <div className="pt-2 border-t border-brand-sand-border/60 flex flex-wrap items-center justify-between text-xs gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSettlement(stl);
                        setPaymentProofImage(null);
                        setPaymentTxnId('');
                        setIsUpiModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-brand-sand hover:bg-brand-orange/10 hover:text-brand-orange text-brand-navy text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5 text-brand-orange" />
                      <span>Pay via UPI / QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => settleDebt(stl.from, stl.to, stl.amount)}
                      className="px-3.5 py-1.5 rounded-xl bg-brand-teal hover:bg-brand-teal/90 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark Settled</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Individual Shares & Expense History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Individual Member Balances */}
        <div className="bg-white rounded-3xl p-6 border border-brand-sand-border shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base text-brand-navy flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-teal" />
              <span>Member Contribution Breakdown</span>
            </h3>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="text-xs font-bold text-brand-orange hover:underline flex items-center gap-1"
            >
              + Invite Friends
            </button>
          </div>

          <div className="space-y-3">
            {memberBalances.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-brand-sand/40 border border-brand-sand-border"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={m.avatar}
                    alt={m.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div>
                    <div className="text-xs font-semibold text-brand-navy">{m.name}</div>
                    <div className="text-[11px] text-brand-navy/60">
                      Paid {formatPrice(m.paid)} · Share {formatPrice(m.shareOwed)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {m.balance > 0 ? (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      Gets back +{formatPrice(m.balance)}
                    </span>
                  ) : m.balance < 0 ? (
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                      Owes {formatPrice(Math.abs(m.balance))}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                      Settled
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expense History & Add Action */}
        <div className="bg-white rounded-3xl p-6 border border-brand-sand-border shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base text-brand-navy flex items-center gap-2">
              <Receipt className="w-4 h-4 text-brand-orange" />
              <span>Expense History & Receipts</span>
            </h3>
            <button
              onClick={openExpenseModal}
              className="inline-flex items-center gap-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Expense</span>
            </button>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {(trip.budget.expenses || []).map((exp) => {
              const proof = exp.receiptUrl || exp.paymentProof;
              return (
                <div
                  key={exp.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-brand-sand/30 border border-brand-sand-border text-xs"
                >
                  <div className="flex items-center gap-3">
                    {proof ? (
                      <div
                        onClick={() => setActiveReceiptModal(proof)}
                        className="w-10 h-10 rounded-xl overflow-hidden border border-brand-sand-border relative cursor-pointer group shrink-0"
                        title="Click to view receipt or payment proof"
                      >
                        <img src={proof} alt="Bill or Proof" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white">
                          <Maximize2 className="w-3 h-3" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-brand-sand border border-brand-sand-border flex items-center justify-center text-brand-navy/60 shrink-0">
                        {categoryIcons[exp.category] || <Receipt className="w-4 h-4" />}
                      </div>
                    )}

                    <div>
                      <div className="font-semibold text-brand-navy flex items-center gap-2">
                        <span>{exp.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-brand-sand dark:bg-slate-700 text-brand-navy/70 dark:text-slate-300 border border-brand-sand-border">
                          {exp.splitMode === 'weighted' ? 'Weighted Split' : 'Equal Split'}
                        </span>
                      </div>
                      <div className="text-[11px] text-brand-navy/60">
                        Paid by <strong className="text-brand-teal">{exp.paidBy}</strong> · {exp.date}
                        {exp.transactionId && (
                          <span className="ml-1 text-[10px] font-mono font-medium text-brand-teal">
                            (Ref: {exp.transactionId})
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-brand-navy/50 dark:text-slate-400 mt-0.5">
                        Shared with:{' '}
                        <strong className="text-brand-navy/80 dark:text-slate-300 font-semibold">
                          {(exp.splitWith || []).length === (trip.members || []).length
                            ? 'All travelers'
                            : (exp.splitWith || []).join(', ')}
                        </strong>
                      </div>
                      {proof && (
                        <button
                          type="button"
                          onClick={() => setActiveReceiptModal(proof)}
                          className="text-[10px] text-brand-orange hover:underline font-semibold flex items-center gap-1 mt-0.5 text-left"
                        >
                          <span>🧾 {exp.type === 'settlement' ? 'View Payment Proof' : 'Bill attached'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-brand-navy">{formatPrice(exp.amount)}</div>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full capitalize font-medium ${
                      exp.type === 'verified' || exp.type === 'settlement' 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {exp.type}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Record Expense Modal with Bill Upload */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-floating border border-brand-sand-border space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-brand-sand-border pb-3">
              <h3 className="font-semibold text-base text-brand-navy flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-brand-orange" />
                <span>Record Shared Expense</span>
              </h3>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-brand-navy/60 hover:text-brand-navy text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-brand-navy mb-1">
                  Expense Description
                </label>
                <input
                  type="text"
                  required
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="e.g. Innova Airport Taxi, Dinner at Curlies"
                  className="w-full text-xs rounded-xl p-2.5 border border-brand-sand-border focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="2500"
                    className="w-full text-xs rounded-xl p-2.5 border border-brand-sand-border focus:outline-none focus:border-brand-orange"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1">
                    Category
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full text-xs rounded-xl p-2.5 border border-brand-sand-border focus:outline-none focus:border-brand-orange"
                  >
                    <option value="accommodation">Accommodation</option>
                    <option value="food">Food & Dining</option>
                    <option value="transport">Transport</option>
                    <option value="activities">Activities</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-navy mb-1">
                  Who Paid
                </label>
                <select
                  value={expensePaidBy}
                  onChange={(e) => setExpensePaidBy(e.target.value)}
                  className="w-full text-xs rounded-xl p-2.5 border border-brand-sand-border focus:outline-none focus:border-brand-orange"
                >
                  {(trip.members || []).map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} {m.id === currentUser?.id ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Equal vs Custom Weighted Split Mode Toggle */}
              <div>
                <label className="block text-xs font-semibold text-brand-navy mb-1.5">
                  Split Methodology
                </label>
                <div className="flex rounded-xl bg-brand-sand dark:bg-slate-800 p-1 border border-brand-sand-border dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setExpenseSplitMode('equal');
                      setSplitValidationError('');
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      expenseSplitMode === 'equal'
                        ? 'bg-brand-navy text-white shadow-xs'
                        : 'text-brand-navy/60 dark:text-slate-400 hover:text-brand-navy'
                    }`}
                  >
                    Equal Split
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExpenseSplitMode('weighted');
                      setSplitValidationError('');
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      expenseSplitMode === 'weighted'
                        ? 'bg-brand-navy text-white shadow-xs'
                        : 'text-brand-navy/60 dark:text-slate-400 hover:text-brand-navy'
                    }`}
                  >
                    Custom Weighted (%)
                  </button>
                </div>
              </div>

              {/* Participating Travelers & Weight Allocations */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200">
                    Split Among Travelers ({selectedSplitMembers.length} selected)
                  </label>
                  {expenseSplitMode === 'weighted' && (
                    <span className={`text-[11px] font-bold ${totalCustomWeight === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      Total: {totalCustomWeight}% / 100%
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 rounded-2xl bg-brand-sand/40 dark:bg-slate-800/60 border border-brand-sand-border dark:border-slate-700">
                  {(trip.members || []).map((m) => {
                    const isSelected = selectedSplitMembers.includes(m.name);
                    const calculatedShare =
                      expenseSplitMode === 'equal'
                        ? Math.round(Number(expenseAmount || 0) / Math.max(selectedSplitMembers.length, 1))
                        : Math.round(((Number(expenseAmount || 0)) * (Number(customWeights[m.name]) || 0)) / 100);

                    return (
                      <div
                        key={m.id}
                        className={`flex items-center justify-between p-2 rounded-xl transition-all border ${
                          isSelected
                            ? 'bg-white dark:bg-slate-800 border-brand-orange/40 shadow-xs'
                            : 'bg-white/40 dark:bg-slate-900/40 border-transparent opacity-60'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleMember(m.name)}
                            className="rounded text-brand-orange focus:ring-brand-orange"
                          />
                          <img
                            src={m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt={m.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span className="font-semibold text-xs text-brand-navy dark:text-white truncate">
                            {m.name}
                          </span>
                        </label>

                        {isSelected && (
                          <div className="flex items-center gap-2 shrink-0">
                            {expenseSplitMode === 'weighted' ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={customWeights[m.name] ?? 0}
                                  onChange={(e) => handleWeightChange(m.name, e.target.value)}
                                  className="w-14 p-1 text-center font-bold text-xs rounded-lg border border-brand-sand-border dark:border-slate-600 focus:outline-none focus:border-brand-orange dark:bg-slate-700 dark:text-white"
                                />
                                <span className="text-xs font-semibold text-brand-navy/60">%</span>
                              </div>
                            ) : null}
                            <span className="text-[11px] font-bold text-brand-teal">
                              {formatPrice(calculatedShare)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Validation Warning Alert */}
              {splitValidationError && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{splitValidationError}</span>
                </div>
              )}

              {/* Upload Bill Receipt */}
              <div>
                <label className="block text-xs font-semibold text-brand-navy mb-1 flex items-center justify-between">
                  <span>Bill / Receipt Attachment</span>
                  <span className="text-[10px] text-brand-navy/50 font-normal">Optional</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="modal-bill-file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="modal-bill-file"
                    className="cursor-pointer px-3 py-1.5 rounded-xl border border-dashed border-brand-orange text-brand-orange bg-brand-orange/5 hover:bg-brand-orange/10 font-semibold text-[11px] flex items-center gap-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{expenseReceipt ? 'Receipt Loaded' : 'Upload Receipt Image'}</span>
                  </label>
                </div>

                {expenseReceipt && (
                  <div className="relative mt-2 w-24 h-16 rounded-xl overflow-hidden border border-brand-sand-border">
                    <img src={expenseReceipt} alt="Receipt" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setExpenseReceipt(null)}
                      className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-brand-navy/70 hover:bg-brand-sand"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full text-xs font-bold bg-brand-orange hover:bg-brand-orange-hover text-white shadow-sm"
                >
                  Save & Split {expenseSplitMode === 'equal' ? 'Evenly' : 'Custom Weighted'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Target Budget Editor Modal */}
      {isTargetBudgetModalOpen && (
        <div className="fixed inset-0 z-50 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-floating border border-brand-sand-border space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-brand-sand-border pb-2">
              <h3 className="font-semibold text-base text-brand-navy flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-brand-orange" />
                <span>Set Trip Target Budget</span>
              </h3>
              <button onClick={() => setIsTargetBudgetModalOpen(false)} className="text-xs text-brand-navy/60">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTargetBudget} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-brand-navy mb-1">
                  Overall Target Budget (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  value={newTargetBudget}
                  onChange={(e) => setNewTargetBudget(e.target.value)}
                  className="w-full text-base font-bold text-brand-navy p-2.5 rounded-xl border border-brand-sand-border focus:outline-none focus:border-brand-orange"
                />
                <p className="text-[11px] text-brand-navy/60 mt-1">
                  ~{formatPrice(Math.round(Number(newTargetBudget || 0) / (trip.members.length || 4)))} per person for {trip.members.length} members.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsTargetBudgetModalOpen(false)}
                  className="px-4 py-2 rounded-full text-brand-navy/70 hover:bg-brand-sand"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full font-bold bg-brand-orange hover:bg-brand-orange-hover text-white shadow-sm"
                >
                  Update Budget Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPI / QR Settlement Modal */}
      {isUpiModalOpen && selectedSettlement && (() => {
        const creditor = (trip?.members || []).find(m => m.name === selectedSettlement.to) ||
                         (availableUsers || []).find(u => u.name === selectedSettlement.to);
        const creditorQr = creditor?.upiQrCode || createUpiQrSvg(creditor?.upiId || selectedSettlement.upi, selectedSettlement.to);
        const creditorUpi = creditor?.upiId || selectedSettlement.upi;
        const upiDeepLink = `upi://pay?pa=${encodeURIComponent(creditorUpi)}&pn=${encodeURIComponent(selectedSettlement.to)}&am=${selectedSettlement.amount}&cu=INR&tn=${encodeURIComponent(`TripTandem-${trip?.title || 'Trip'}`)}`;

        return (
          <div 
            onClick={() => setIsUpiModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-floating border border-brand-sand-border dark:border-slate-800 space-y-4 text-center text-brand-navy dark:text-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-brand-sand-border dark:border-slate-800">
                <span className="font-bold text-xs flex items-center gap-1.5 text-brand-teal">
                  <QrCode className="w-4 h-4 text-brand-teal" />
                  <span>Direct UPI Split Settlement</span>
                </span>
                <button onClick={() => setIsUpiModalOpen(false)} className="text-xs text-brand-navy/60 dark:text-slate-400">
                  ✕
                </button>
              </div>

              {/* Creditor Persona Info */}
              <div className="flex items-center justify-center gap-2">
                {creditor?.avatar && (
                  <img
                    src={creditor.avatar}
                    alt={selectedSettlement.to}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                    }}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-teal"
                  />
                )}
                <div className="text-left">
                  <div className="text-xs font-bold text-brand-navy dark:text-white flex items-center gap-1">
                    <span>Pay {selectedSettlement.to}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" title="Verified Member ID" />
                  </div>
                  <div className="text-[10px] text-brand-navy/60 dark:text-slate-400">
                    From: {selectedSettlement.from}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-3xl font-extrabold text-brand-orange">
                  {formatPrice(selectedSettlement.amount)}
                </div>
                <div className="text-[11px] text-brand-navy/50 dark:text-slate-400 mt-0.5">
                  Direct debt settlement with zero platform fees
                </div>
              </div>

              {/* Personal Uploaded UPI QR Code */}
              <div className="p-3 bg-brand-sand/60 dark:bg-slate-800 rounded-2xl border border-brand-sand-border dark:border-slate-700 inline-block mx-auto">
                <div className="w-44 h-44 bg-white rounded-xl border border-brand-sand-border p-2 flex flex-col items-center justify-center shadow-inner">
                  <img
                    src={creditorQr || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${encodeURIComponent(creditorUpi || 'tandem@upi')}&pn=${encodeURIComponent(selectedSettlement.to)}&am=${selectedSettlement.amount}&cu=INR`}
                    alt={`UPI QR of ${selectedSettlement.to}`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${encodeURIComponent(creditorUpi || 'tandem@upi')}&pn=${encodeURIComponent(selectedSettlement.to)}&am=${selectedSettlement.amount}&cu=INR`;
                    }}
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
                <div className="text-[10px] font-medium text-brand-navy/60 dark:text-slate-400 mt-1.5 flex items-center justify-center gap-1">
                  <span>Scan via GPay, PhonePe, Paytm, or BHIM</span>
                </div>
              </div>

              {/* Copyable UPI ID */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-brand-sand/50 dark:bg-slate-800/80 border border-brand-sand-border dark:border-slate-700 text-xs">
                <div className="text-left min-w-0 pr-2">
                  <div className="text-[9px] uppercase font-bold text-brand-navy/50 dark:text-slate-400">UPI ID / VPA:</div>
                  <div className="font-mono font-bold text-brand-navy dark:text-slate-100 truncate">{creditorUpi}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(creditorUpi);
                    setIsCopiedUpi(true);
                    setTimeout(() => setIsCopiedUpi(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-brand-sand-border dark:border-slate-600 text-[10px] font-semibold text-brand-teal flex items-center gap-1 hover:bg-brand-teal hover:text-white transition-all shrink-0"
                >
                  {isCopiedUpi ? <CheckCheck className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopiedUpi ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* UPI Deep-link App Opener */}
              <a
                href={upiDeepLink}
                className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange text-xs font-semibold border border-brand-orange/30 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Pay via UPI App (GPay / PhonePe)</span>
              </a>

              {/* Payment Proof / Screenshot Upload */}
              <div className="text-left space-y-2 p-3 rounded-2xl bg-brand-sand/40 dark:bg-slate-800/60 border border-brand-sand-border dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-brand-navy dark:text-slate-200 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-brand-teal" />
                    <span>Attach Payment Proof / Screenshot</span>
                  </label>
                  <span className="text-[10px] text-brand-teal font-medium">Auto-verify</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="upi-payment-proof"
                    accept="image/*"
                    onChange={handlePaymentProofUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="upi-payment-proof"
                    className="cursor-pointer px-3 py-1.5 rounded-xl border border-dashed border-brand-teal text-brand-teal bg-brand-teal/5 hover:bg-brand-teal/10 font-semibold text-[11px] flex items-center gap-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{paymentProofImage ? 'Proof Selected ✓' : 'Upload Screenshot'}</span>
                  </label>
                  {paymentProofImage && (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Ready
                    </span>
                  )}
                </div>

                {paymentProofImage && (
                  <div className="relative mt-2 w-28 h-20 rounded-xl overflow-hidden border border-brand-sand-border shadow-sm group">
                    <img src={paymentProofImage} alt="Payment Proof" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPaymentProofImage(null)}
                      className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-black/80 rounded-full text-white"
                      title="Remove Proof"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <input
                  type="text"
                  value={paymentTxnId}
                  onChange={(e) => setPaymentTxnId(e.target.value)}
                  placeholder="Optional: UPI Ref / UTR No. (e.g. 402918239012)"
                  className="w-full text-xs rounded-xl p-2 bg-white dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-slate-100 placeholder:text-brand-navy/40 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-teal"
                />
              </div>

              <button
                onClick={() => {
                  settleDebt(selectedSettlement.from, selectedSettlement.to, selectedSettlement.amount, {
                    receiptUrl: paymentProofImage,
                    paymentProof: paymentProofImage,
                    transactionId: paymentTxnId.trim() || undefined,
                  });
                  setIsUpiModalOpen(false);
                }}
                className="w-full py-2.5 rounded-full font-bold text-xs bg-brand-teal hover:bg-brand-teal/90 text-white shadow-sm flex items-center justify-center gap-1.5 transition-transform active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Mark Payment Completed {paymentProofImage ? '(with Proof)' : ''}</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Receipt Lightbox Modal */}
      {activeReceiptModal && (
        <div 
          onClick={() => setActiveReceiptModal(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
        >
          <div className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-floating p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-brand-sand-border">
              <span className="font-bold text-xs text-brand-navy flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-brand-orange" />
                <span>Verified Expense Receipt</span>
              </span>
              <button
                onClick={() => setActiveReceiptModal(null)}
                className="p-1 rounded-full hover:bg-brand-sand text-brand-navy"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img 
              src={activeReceiptModal} 
              alt="Receipt" 
              className="w-full max-h-[70vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default BudgetDashboard;
