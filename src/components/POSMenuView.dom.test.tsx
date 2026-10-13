import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { POSMenuView, type POSMenuViewProps } from './POSMenuView';
import { translate } from '../lib/i18n/translate';

/** Ekrandagi yozuv lug'atdan olinadi — test ham o'sha manbadan o'qiydi. */
const uz = (key: string) => translate('uz', key as never);

function renderMenu(over: Partial<POSMenuViewProps> = {}) {
  const props: POSMenuViewProps = {
    t: (key: string) => uz(key),
    selectedCategoryName: null,
    searchQuery: '',
    showMobileSearch: false,
    searchInputRef: React.createRef<HTMLInputElement>(),
    allCategories: [],
    categoryCounts: {},
    displayedProducts: [],
    onBackToCategories: vi.fn(),
    onBackToTables: vi.fn(),
    onSearchChange: vi.fn(),
    onCloseSearch: vi.fn(),
    onOpenMobileSearch: vi.fn(),
    onSelectCategory: vi.fn(),
    onAddToCart: vi.fn(),
    onOpenBarcodeScanner: vi.fn(),
    ...over,
  };
  return { props, ...render(<POSMenuView {...props} />) };
}

describe('POSMenuView — shtrix-kod skaneri', () => {
  it('skaner tugmasi bosilganda kamera oynasini ochishni so‘raydi', () => {
    const { props } = renderMenu();

    fireEvent.click(screen.getByRole('button', { name: uz('menu.scanBarcode') }));

    expect(props.onOpenBarcodeScanner).toHaveBeenCalledTimes(1);
  });

  it('kategoriya ichida ham tugma joyida turadi', () => {
    renderMenu({ selectedCategoryName: 'Ichimliklar' });

    expect(screen.getByRole('button', { name: uz('menu.scanBarcode') })).toBeTruthy();
  });
});
