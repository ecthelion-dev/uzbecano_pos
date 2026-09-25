import { useState, useCallback } from 'react';
import type { TranslationKey } from '../lib/i18n/dictionaries/uz';

export function useAdminPin() {
  const [showAdminPinModal, setShowAdminPinModal] = useState<boolean>(false);
  const [adminPinAction, setAdminPinAction] = useState<((approvalToken?: string) => void) | null>(null);
  const [adminPinTitle, setAdminPinTitle] = useState<TranslationKey>('admin.pinKitchenCancel');

  const requestAdminPin = useCallback((
    action: (approvalToken?: string) => void,
    titleKey: TranslationKey = 'admin.pinKitchenCancel',
  ) => {
    setAdminPinAction(() => action);
    setAdminPinTitle(titleKey);
    setShowAdminPinModal(true);
  }, []);

  return {
    showAdminPinModal,
    setShowAdminPinModal,
    adminPinAction,
    setAdminPinAction,
    adminPinTitle,
    requestAdminPin,
  };
}
