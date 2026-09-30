import { describe, it, expect } from 'vitest';
import { ACTIVE_POLL_MS, IDLE_POLL_MS, pollIntervalMs, shouldPollWhileHidden } from './pollPolicy';

describe("yurak urishi ritmi (pollIntervalMs)", () => {
  it("bo'sh zalda sekin, ish bo'lganda tez", () => {
    expect(pollIntervalMs({ isDesktopApp: false, hasLiveWork: false, watchingQr: false })).toBe(IDLE_POLL_MS);
    expect(pollIntervalMs({ isDesktopApp: false, hasLiveWork: true, watchingQr: false })).toBe(ACTIVE_POLL_MS);
  });

  /*
   * QR kuzatuvi — alohida holat: zal bo'sh bo'lsa ham ritm tez. Sabab:
   * buyurtmani mehmon o'zi kiritadi, ya'ni oshxona kutmasligi kerak.
   */
  it("QR kuzatuvi yoqilgan bo'lsa zal bo'sh bo'lsa ham tez", () => {
    expect(pollIntervalMs({ isDesktopApp: false, hasLiveWork: false, watchingQr: true })).toBe(ACTIVE_POLL_MS);
  });

  it('desktop kassa hech qachon sekinlashmaydi', () => {
    expect(pollIntervalMs({ isDesktopApp: true, hasLiveWork: false, watchingQr: false })).toBe(ACTIVE_POLL_MS);
  });
});

describe("yig'ilgan oynada so'rash (shouldPollWhileHidden)", () => {
  it("oddiy brauzerda yig'ilgan oynada so'ralmaydi", () => {
    expect(shouldPollWhileHidden({ isDesktopApp: false, watchingQr: false })).toBe(false);
  });

  it("QR buyurtma kuzatilsa so'raladi", () => {
    expect(shouldPollWhileHidden({ isDesktopApp: false, watchingQr: true })).toBe(true);
  });

  it("desktop kassada so'raladi", () => {
    expect(shouldPollWhileHidden({ isDesktopApp: true, watchingQr: false })).toBe(true);
  });
});
