/**
 * TripTandem Client-Side Budget Engine (Paise integer precision)
 * Mirrors the server-side BudgetEngine to provide 100% mathematical consistency.
 */

export class BudgetEngine {
  static calculateExpenseSharesInPaise(expense) {
    const rawAmount = Number(expense.amount);
    if (isNaN(rawAmount) || rawAmount < 0) {
      throw new Error(`Expense amount must be a non-negative number. Received: ${expense.amount}`);
    }

    const totalPaise = Math.round(rawAmount * 100);
    if (totalPaise === 0) {
      const zeroMap = new Map();
      (expense.splitWith || []).forEach(p => zeroMap.set(p, 0));
      return zeroMap;
    }

    const participants = expense.splitWith;
    if (!Array.isArray(participants) || participants.length === 0) {
      throw new Error('Expense participant list (splitWith) must be a non-empty array.');
    }

    const splitMode = expense.splitMode || 'equal';
    const sharesInPaise = new Map();

    if (splitMode === 'equal') {
      const n = participants.length;
      const baseShare = Math.floor(totalPaise / n);
      const remainder = totalPaise % n;

      participants.forEach((p, index) => {
        const extraPaisa = index < remainder ? 1 : 0;
        sharesInPaise.set(p, baseShare + extraPaisa);
      });
    } else if (splitMode === 'weighted') {
      const splits = expense.splits || {};
      const weights = [];
      let totalWeight = 0;

      for (const p of participants) {
        const w = Number(splits[p]);
        if (isNaN(w) || w < 0 || !isFinite(w)) {
          throw new Error(`Participant "${p}" has invalid weight: ${splits[p]}`);
        }
        weights.push({ participant: p, weight: w });
        totalWeight += w;
      }

      if (totalWeight <= 0) {
        throw new Error('Total weight across participants must be greater than zero.');
      }

      let allocatedPaiseSum = 0;
      const preliminaryShares = [];

      weights.forEach(({ participant, weight }) => {
        const exactPaise = (totalPaise * weight) / totalWeight;
        const floorPaise = Math.floor(exactPaise);
        const fractional = exactPaise - floorPaise;
        allocatedPaiseSum += floorPaise;
        preliminaryShares.push({ participant, floorPaise, fractional });
      });

      let remainderPaise = totalPaise - allocatedPaiseSum;
      preliminaryShares.sort((a, b) => b.fractional - a.fractional);

      preliminaryShares.forEach((item, idx) => {
        const bonus = idx < remainderPaise ? 1 : 0;
        sharesInPaise.set(item.participant, item.floorPaise + bonus);
      });
    }

    return sharesInPaise;
  }

  static reconcileTripBudget(trip) {
    if (!trip || !trip.budget) return null;

    const { totalTarget = 40000, categories = {}, expenses = [], splitMode = 'equal' } = trip.budget;
    const members = trip.members || [];
    
    // Resolve identifier to a canonical member key (preferring member.id)
    const resolveMemberKey = (identifier) => {
      if (!identifier) return null;
      const match = members.find(m => m.id === identifier || m.name === identifier);
      return match ? (match.id || match.name) : identifier;
    };

    const memberKeys = members.map(m => m.id || m.name);

    const paidByMemberPaise = new Map();
    const shareByMemberPaise = new Map();

    memberKeys.forEach(key => {
      paidByMemberPaise.set(key, 0);
      shareByMemberPaise.set(key, 0);
    });

    let totalSpentPaise = 0;

    for (const exp of expenses) {
      const expPaise = Math.round((Number(exp.amount) || 0) * 100);
      totalSpentPaise += expPaise;

      const payer = resolveMemberKey(exp.paidBy);
      if (payer) {
        paidByMemberPaise.set(payer, (paidByMemberPaise.get(payer) || 0) + expPaise);
      }

      try {
        const sharesMap = BudgetEngine.calculateExpenseSharesInPaise(exp);
        for (const [rawParticipant, paise] of sharesMap.entries()) {
          const participant = resolveMemberKey(rawParticipant);
          shareByMemberPaise.set(participant, (shareByMemberPaise.get(participant) || 0) + paise);
        }
      } catch (err) {
        const fallbackList = Array.isArray(exp.splitWith) && exp.splitWith.length > 0 ? exp.splitWith : memberKeys;
        const n = Math.max(fallbackList.length, 1);
        const base = Math.floor(expPaise / n);
        const rem = expPaise % n;
        fallbackList.forEach((rawP, i) => {
          const p = resolveMemberKey(rawP);
          const share = base + (i < rem ? 1 : 0);
          shareByMemberPaise.set(p, (shareByMemberPaise.get(p) || 0) + share);
        });
      }
    }

    const allParticipants = Array.from(
      new Set([...memberKeys, ...paidByMemberPaise.keys(), ...shareByMemberPaise.keys()])
    );

    let netZeroSumCheckPaise = 0;

    const memberBalances = allParticipants.map(key => {
      const existingMember = members.find(m => m.id === key || m.name === key);
      const paidPaise = paidByMemberPaise.get(key) || 0;
      const shareOwedPaise = shareByMemberPaise.get(key) || 0;
      const netPaise = paidPaise - shareOwedPaise;

      netZeroSumCheckPaise += netPaise;

      return {
        id: existingMember?.id || key,
        name: existingMember?.name || key,
        avatar: existingMember?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: existingMember?.role || 'Planner',
        color: existingMember?.color || '#FF6B45',
        upiId: existingMember?.upiId || '',
        paid: paidPaise / 100,
        shareOwed: shareOwedPaise / 100,
        balance: netPaise / 100,
        balancePaise: netPaise,
      };
    });

    if (netZeroSumCheckPaise !== 0 && memberBalances.length > 0) {
      memberBalances[0].balancePaise -= netZeroSumCheckPaise;
      memberBalances[0].balance = memberBalances[0].balancePaise / 100;
    }

    const optimalSettlements = BudgetEngine.computeMinimumCashFlowSettlements(memberBalances);
    const totalEstimated = Object.values(categories).reduce((sum, val) => sum + (Number(val) || 0), 0);
    const actualLogged = totalSpentPaise / 100;
    const memberCount = Math.max(members.length, 1);

    return {
      totalTarget: Number(totalTarget) || 40000,
      totalEstimated,
      actualLogged,
      remaining: totalTarget - actualLogged,
      perPersonTarget: Math.round(totalTarget / memberCount),
      perPersonEstimated: Math.round(totalEstimated / memberCount),
      categories,
      splitMode,
      memberBalances,
      optimalSettlements,
      zeroSumReconciled: true,
    };
  }

  static computeMinimumCashFlowSettlements(memberBalances) {
    const debtors = [];
    const creditors = [];

    memberBalances.forEach(m => {
      const paise = m.balancePaise !== undefined ? m.balancePaise : Math.round(m.balance * 100);
      if (paise < 0) {
        debtors.push({ ...m, amountOwedPaise: Math.abs(paise) });
      } else if (paise > 0) {
        creditors.push({ ...m, amountDuePaise: paise });
      }
    });

    const settlements = [];
    debtors.sort((a, b) => b.amountOwedPaise - a.amountOwedPaise);
    creditors.sort((a, b) => b.amountDuePaise - a.amountDuePaise);

    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];

      const settlementPaise = Math.min(debtor.amountOwedPaise, creditor.amountDuePaise);

      if (settlementPaise > 0) {
        settlements.push({
          id: `settle-${Date.now()}-${dIdx}-${cIdx}`,
          fromId: debtor.id,
          fromName: debtor.name,
          fromAvatar: debtor.avatar,
          toId: creditor.id,
          toName: creditor.name,
          toAvatar: creditor.avatar,
          toUpiId: creditor.upiId || `${creditor.name.toLowerCase().replace(/\s+/g, '')}@upi`,
          amount: settlementPaise / 100,
          amountPaise: settlementPaise,
          status: 'pending',
        });

        debtor.amountOwedPaise -= settlementPaise;
        creditor.amountDuePaise -= settlementPaise;
      }

      if (debtor.amountOwedPaise === 0) dIdx++;
      if (creditor.amountDuePaise === 0) cIdx++;
    }

    return settlements;
  }
}

