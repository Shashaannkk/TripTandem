/**
 * Pure, Timezone-Safe Date Utilities for TripTandem
 * Eliminates all UTC vs Local timezone shifts and off-by-one day bugs.
 * Standard format: 'YYYY-MM-DD'
 */

export const MAX_ADVANCE_BOOKING_DAYS = 365;

/**
 * Format Date object to 'YYYY-MM-DD' in local timezone
 */
export function formatToDateString(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse 'YYYY-MM-DD' into a local Date object at local midnight (00:00:00)
 */
export function parseDateString(str) {
  if (!str || typeof str !== 'string') return null;
  const parts = str.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  const d = new Date(year, month, day, 0, 0, 0, 0);
  return d;
}

/**
 * Get today's date string in local timezone
 */
export function getTodayString() {
  return formatToDateString(new Date());
}

/**
 * Get maximum selectable date string (365 days from today)
 */
export function getMaxBookingDateString(days = MAX_ADVANCE_BOOKING_DAYS) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatToDateString(d);
}

/**
 * Add days to a 'YYYY-MM-DD' string
 */
export function addDays(dateStr, numDays) {
  const d = parseDateString(dateStr);
  if (!d) return '';
  d.setDate(d.getDate() + numDays);
  return formatToDateString(d);
}

/**
 * Calculate difference in days between two 'YYYY-MM-DD' strings
 */
export function getDaysDifference(startStr, endStr) {
  const start = parseDateString(startStr);
  const end = parseDateString(endStr);
  if (!start || !end) return 0;
  const diffTime = end.getTime() - start.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format 'YYYY-MM-DD' for user-facing display
 * Example: '18 Oct 2026' or 'Sun, 18 Oct'
 */
export function formatDisplayDate(dateStr, options = { withDay: false, withYear: false }) {
  const d = parseDateString(dateStr);
  if (!d) return '';

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const dayOfWeek = DAYS[d.getDay()];
  const monthName = MONTHS[d.getMonth()];
  const dayNum = d.getDate();
  const year = d.getFullYear();

  if (options.withDay && options.withYear) {
    return `${dayOfWeek}, ${dayNum} ${monthName} ${year}`;
  }
  if (options.withDay) {
    return `${dayOfWeek}, ${dayNum} ${monthName}`;
  }
  if (options.withYear) {
    return `${dayNum} ${monthName} ${year}`;
  }
  return `${dayNum} ${monthName}`;
}

/**
 * Validate a date range
 */
export function validateBookingDates(checkInStr, checkOutStr) {
  const todayStr = getTodayString();
  const maxStr = getMaxBookingDateString();

  if (!checkInStr) {
    return { valid: false, error: 'Please select a check-in date' };
  }
  if (checkInStr < todayStr) {
    return { valid: false, error: 'Check-in cannot be in the past' };
  }
  if (checkInStr > maxStr) {
    return {
      valid: false,
      error: `Check-in cannot exceed ${MAX_ADVANCE_BOOKING_DAYS} days (12 months) in advance`,
    };
  }

  if (checkOutStr) {
    if (checkOutStr <= checkInStr) {
      return { valid: false, error: 'Check-out must be after check-in' };
    }
    const nights = getDaysDifference(checkInStr, checkOutStr);
    if (nights > 30) {
      return { valid: false, error: 'Maximum stay per single booking is 30 nights' };
    }
  }

  return { valid: true, error: null };
}
