import { describe, expect, it } from 'vitest';
import { filterOrdersForPeriod } from './reportPeriod';

describe('davr hisobotidagi buyurtmalar', () => {
    it('API ortiqcha eski buyurtmalarni qaytarsa ham faqat tanlangan davrni qoldiradi', () => {
        const from = new Date('2026-09-25T19:00:00.000Z');
        const to = new Date('2026-09-26T19:00:00.000Z');
        const orders = [
            { id: 'old', closedAt: '2026-09-25T18:59:59.999Z' },
            { id: 'start', closedAt: from.toISOString() },
            { id: 'today', closedAt: '2026-09-26T08:00:00.000Z' },
            { id: 'end', closedAt: to.toISOString() },
            { id: 'future', closedAt: '2026-09-26T19:00:00.001Z' },
        ];

        expect(filterOrdersForPeriod(orders, from, to).map((order) => order.id))
            .toEqual(['start', 'today', 'end']);
    });

    it('hali yopilmagan buyurtma uchun ochilgan vaqtni ishlatadi', () => {
        const from = new Date('2026-09-26T00:00:00.000Z');
        const to = new Date('2026-09-27T00:00:00.000Z');
        const orders = [
            { id: 'open-today', createdAt: '2026-09-26T12:00:00.000Z' },
            { id: 'open-old', createdAt: '2026-09-25T12:00:00.000Z' },
        ];

        expect(filterOrdersForPeriod(orders, from, to).map((order) => order.id))
            .toEqual(['open-today']);
    });
});