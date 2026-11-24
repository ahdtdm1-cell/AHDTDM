/**
 * Format an ISO timestamp as a short Vietnamese relative time.
 *
 * Backend datetimes are stored as naive UTC (datetime.utcnow) and serialized
 * without a timezone suffix, so we append "Z" when it is missing to avoid the
 * browser parsing them as local time.
 */
export function formatRelativeTime(value?: string | null): string {
  if (!value) return '';

  const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'Vừa xong';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'Vừa xong';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;

  return date.toLocaleDateString('vi-VN');
}
