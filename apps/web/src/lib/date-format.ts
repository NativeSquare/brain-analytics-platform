import { format } from "date-fns";

/** Standard date: 07/04/2026 */
export function formatDate(date: Date | number): string {
  return format(new Date(date), "dd/MM/yyyy");
}

/** Date with time: 07/04/2026 at 14:00 */
export function formatDateTime(date: Date | number): string {
  return format(new Date(date), "dd/MM/yyyy 'at' HH:mm");
}

/** Full date with day name: Tuesday 07/04/2026 */
export function formatDateFull(date: Date | number): string {
  return format(new Date(date), "EEEE dd/MM/yyyy");
}

/** Short date with day name: Tue 07/04/2026 at 14:00 */
export function formatDateTimeShort(date: Date | number): string {
  return format(new Date(date), "EEE dd/MM/yyyy 'at' HH:mm");
}
