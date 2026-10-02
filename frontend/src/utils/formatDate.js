/**
 * Format an ISO date string to a human-readable format.
 * @param {string} iso
 * @param {Intl.DateTimeFormatOptions} opts
 */
export const formatDate = (iso, opts = { dateStyle: 'medium' }) =>
  new Intl.DateTimeFormat('en-US', opts).format(new Date(iso));
