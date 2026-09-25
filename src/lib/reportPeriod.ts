import type { DBOrder } from '../types';

type ReportOrderDates = Pick<DBOrder, 'closedAt' | 'createdAt'>;

export function filterOrdersForPeriod<T extends ReportOrderDates>(
    orders: readonly T[],
    from: Date | null,
    to: Date | null,
): T[] {
    if (!from && !to) return [...orders];

    const fromTime = from?.getTime() ?? Number.NEGATIVE_INFINITY;
    const toTime = to?.getTime() ?? Number.POSITIVE_INFINITY;
    if (!Number.isFinite(fromTime) && from) return [];
    if (!Number.isFinite(toTime) && to) return [];

    return orders.filter((order) => {
        const value = order.closedAt || order.createdAt;
        if (!value) return false;

        const time = new Date(value).getTime();
        return Number.isFinite(time) && time >= fromTime && time <= toTime;
    });
}