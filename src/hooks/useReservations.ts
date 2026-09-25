import { useState, useCallback } from 'react';
import type { DBReservation } from '../types';
import type { TranslationKey } from '../lib/i18n/dictionaries/uz';
import { API_BASE_URL } from '../constants';
import { fetchWithTimeout } from '../lib/net';

interface UseReservationsParams {
  getActiveCafeId: () => string;
  getAuthHeaders: (approvalToken?: string) => Record<string, string>;
  requestAdminPin: (action: (approvalToken?: string) => void, titleKey?: TranslationKey) => void;
  handleSelectTable: (tableNumber: string, ignoreReservation?: boolean) => void;
  setToastMessage: (msg: string | null) => void;
  t: (key: TranslationKey, params?: any) => string;
}

export function useReservations({
  getActiveCafeId,
  getAuthHeaders,
  requestAdminPin,
  handleSelectTable,
  setToastMessage,
  t,
}: UseReservationsParams) {
  const [reservations, setReservations] = useState<DBReservation[]>([]);
  const [showReservationModal, setShowReservationModal] = useState<boolean>(false);
  const [showReservationDetailsModal, setShowReservationDetailsModal] = useState<boolean>(false);
  const [selectedReservation, setSelectedReservation] = useState<DBReservation | null>(null);
  const [reservationDefaultTable, setReservationDefaultTable] = useState<string | undefined>(undefined);

  const handleCreateReservation = useCallback(async (data: {
    tableNumber: string;
    customerName: string;
    customerPhone?: string;
    guestCount: number;
    reservedTime: string;
    notes?: string;
  }): Promise<boolean> => {
    try {
      const cafeId = getActiveCafeId();
      if (!cafeId) return false;
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ cafeId, ...data }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setToastMessage(err.error || t('reservation.error'));
        setTimeout(() => setToastMessage(null), 3000);
        return false;
      }
      const created = await res.json();
      setReservations(prev => [...prev.filter(r => r.id !== created.id), created]);
      setToastMessage(t('reservation.success'));
      setTimeout(() => setToastMessage(null), 3000);
      return true;
    } catch (err: any) {
      setToastMessage(err.message || t('reservation.error'));
      setTimeout(() => setToastMessage(null), 3000);
      return false;
    }
  }, [getActiveCafeId, getAuthHeaders, setToastMessage, t]);

  const handleCancelReservation = useCallback((reservationId: string) => {
    requestAdminPin(async (approvalToken?: string) => {
      try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/api/reservations?id=${encodeURIComponent(reservationId)}`, {
          method: 'DELETE',
          headers: getAuthHeaders(approvalToken),
        });
        if (res.ok) {
          setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: 'CANCELLED' } : r));
          setShowReservationDetailsModal(false);
          setSelectedReservation(null);
          setToastMessage(t('reservation.cancelSuccess'));
          setTimeout(() => setToastMessage(null), 3000);
        }
      } catch {}
    }, 'admin.pinReservationCancel');
  }, [getAuthHeaders, requestAdminPin, setToastMessage, t]);

  const handleOpenReservedTable = useCallback((tableNumber: string, reservationId: string) => {
    requestAdminPin(async (approvalToken?: string) => {
      try {
        await fetchWithTimeout(`${API_BASE_URL}/api/reservations`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders(approvalToken) },
          body: JSON.stringify({ id: reservationId, status: 'COMPLETED' }),
        });
        setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: 'COMPLETED' } : r));
        setShowReservationDetailsModal(false);
        setSelectedReservation(null);
        setShowReservationModal(false);
        handleSelectTable(tableNumber, true);
      } catch {}
    }, 'admin.pinReservationClose');
  }, [getAuthHeaders, handleSelectTable, requestAdminPin]);

  return {
    reservations,
    setReservations,
    showReservationModal,
    setShowReservationModal,
    showReservationDetailsModal,
    setShowReservationDetailsModal,
    selectedReservation,
    setSelectedReservation,
    reservationDefaultTable,
    setReservationDefaultTable,
    handleCreateReservation,
    handleCancelReservation,
    handleOpenReservedTable,
  };
}
