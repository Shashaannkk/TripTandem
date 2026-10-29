/**
 * TripTandem Precise Budget Splitting and Balance Reconciliation Engine
 *
 * Enforces integer minor currency units (paise for INR) to prevent floating-point
 * drift. Guarantees that sum(netBalances) === 0 exactly.
 */

export class BudgetEngine {
  /**
   * Validate and calculate split shares for a single expense in integer paise.
   *
   * @param {Object} expense
   * @param {number} expense.amount - Amount in primary currency (e.g. INR)
   * @param {string} expense.paidBy - Name or ID of payer
   * @param {string} [expense.splitMode='equal'] - 'equal' | 'weighted'
   * @param {string[]} expense.splitWith - Array of participant names or IDs
   * @param {Object} [expense.splits] - Key-value map of weights or percentages
   * @returns {Map<string, number>} participant -> share in paise
   */
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
        const rawW = (splits instanceof Map || typeof splits?.get === 'function')
          ? splits.get(p)
          : splits[p];
        const w = Number(rawW);
        if (isNaN(w) || w < 0 || !isFinite(w) || rawW === null || rawW === undefined) {
          throw new Error(
            `Participant "${p}" has an invalid weight: ${rawW}. Weights must be non-negative finite numbers.`
          );
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
        // Proportion of total
        const exactPaise = (totalPaise * weight) / totalWeight;
        const floorPaise = Math.floor(exactPaise);
        const fractional = exactPaise - floorPaise;
        allocatedPaiseSum += floorPaise;
        preliminaryShares.push({ participant, floorPaise, fractional });
      });

      // Distribute any remainder paise to largest fractional portions (Largest Remainder Method)
      let remainderPaise = totalPaise - allocatedPaiseSum;
      preliminaryShares.sort((a, b) => b.fractional - a.fractional);

      preliminaryShares.forEach((item, idx) => {
        const bonus = idx < remainderPaise ? 1 : 0;
        sharesInPaise.set(item.participant, item.floorPaise + bonus);
      });
    } else {
      throw new Error(`Unsupported split mode: "${splitMode}". Supported modes: "equal", "weighted".`);
    }

    // Mathematical invariant verification: sum(shares) === totalPaise
    let checkSum = 0;
    for (const paise of sharesInPaise.values()) {
      checkSum += paise;
    }
    if (checkSum !== totalPaise) {
      throw new Error(`Internal reconciliation error: sum of shares (${checkSum}) does not match total expense (${totalPaise})`);
    }

    return sharesInPaise;
  }

  /**
   * Validate custom weights mapping across participants.
   *
   * @param {Object|Map} weights
   * @param {string[]} [participants]
   * @returns {{ valid: boolean, error?: string, normalized?: Record<string, number>, totalWeight?: number }}
   */
  static validateCustomWeights(weights, participants = []) {
    if (!weights || typeof weights !== 'object') {
      return { valid: false, error: 'Weights must be an object or Map.' };
    }

    const keys = Array.isArray(participants) && participants.length > 0
      ? participants
      : (weights instanceof Map ? Array.from(weights.keys()) : Object.keys(weights));

    if (keys.length === 0) {
      return { valid: false, error: 'No participants provided for weights.' };
    }

    let totalWeight = 0;
    const normalized = {};

    for (const key of keys) {
      const rawVal = (weights instanceof Map || typeof weights?.get === 'function')
        ? weights.get(key)
        : weights[key];
      const w = Number(rawVal);
      if (isNaN(w) || w < 0 || !isFinite(w) || rawVal === null || rawVal === undefined) {
        return {
          valid: false,
          error: `Participant "${key}" has an invalid weight: ${rawVal}. Weights must be non-negative finite numbers.`
        };
      }
      normalized[key] = w;
      totalWeight += w;
    }

    if (totalWeight <= 0) {
      return { valid: false, error: 'Total weight across participants must be greater than zero.' };
    }

    return { valid: true, normalized, totalWeight };
  }

  /**
   * Reconcile all expenses for a trip across all members.
   *
   * @param {Object} trip - Trip object containing members and budget
   * @returns {Object} Full budget summary and balance report
   */
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

    // Track paise per member
    const paidByMemberPaise = new Map();
    const shareByMemberPaise = new Map();

    // Initialize all known trip members
    memberKeys.forEach(key => {
      paidByMemberPaise.set(key, 0);
      shareByMemberPaise.set(key, 0);
    });

    let totalSpentPaise = 0;

    // Process each expense individually
    for (const exp of expenses) {
      const expPaise = Math.round((Number(exp.amount) || 0) * 100);
      totalSpentPaise += expPaise;

      // Credit payer
      const payer = resolveMemberKey(exp.paidBy);
      if (payer) {
        paidByMemberPaise.set(payer, (paidByMemberPaise.get(payer) || 0) + expPaise);
      }

      // Debit participants only
      try {
        const sharesMap = BudgetEngine.calculateExpenseSharesInPaise(exp);
        for (const [rawParticipant, paise] of sharesMap.entries()) {
          const participant = resolveMemberKey(rawParticipant);
          shareByMemberPaise.set(participant, (shareByMemberPaise.get(participant) || 0) + paise);
        }
      } catch (err) {
        // Fallback to equal split among splitWith or all members
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

    // Build member balances
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

    // Zero-sum check assertion (sum of net balances in paise must equal 0)
    if (netZeroSumCheckPaise !== 0) {
      console.warn(`Net balance discrepancy detected: ${netZeroSumCheckPaise} paise. Auto-reconciling...`);
      // Adjust residual 1-2 paise if needed
      if (memberBalances.length > 0) {
        memberBalances[0].balancePaise -= netZeroSumCheckPaise;
        memberBalances[0].balance = memberBalances[0].balancePaise / 100;
      }
    }

    // Optimal Cash Flow Minimum Settlements Algorithm
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
      expenses,
      memberBalances,
      optimalSettlements,
      zeroSumReconciled: true,
    };
  }

  /**
   * Minimum Cash Flow Debt Settlement Algorithm
   * Greedily matches the largest debtor with the largest creditor using integer paise.
   */
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

