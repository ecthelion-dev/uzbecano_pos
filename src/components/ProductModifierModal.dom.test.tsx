import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductModifierModal } from './ProductModifierModal';
import { LanguageProvider } from '../lib/i18n/LanguageProvider';
import { translate } from '../lib/i18n/translate';
import type { DBProduct } from '../types';

/** Ekrandagi yozuv lug'atdan olinadi — test ham o'sha manbadan o'qiydi. */
const uz = (key: string) => translate('uz', key as never);

const osh: DBProduct = {
  id: 'p-osh',
  name: 'Osh',
  category: 'Asosiy',
  price: 30_000,
  variants: [
    { name: 'Standart', price: 30_000, isBase: true },
    { name: 'Katta', price: 40_000 },
  ],
  addons: [{ name: 'Qazi', price: 10_000 }],
};

function renderModal(product: DBProduct | null = osh) {
  const onAddToCart = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <LanguageProvider>
      <ProductModifierModal product={product} onAddToCart={onAddToCart} onClose={onClose} />
    </LanguageProvider>,
  );
  return { onAddToCart, onClose, ...utils };
}

describe('ProductModifierModal', () => {
  it("mahsulot bo'lmasa hech nima chiqmaydi", () => {
    const { container } = renderModal(null);
    expect(container).toBeEmptyDOMElement();
  });

  /*
   * Regressiya: `if (!product) return null;` hooklardan OLDIN turardi.
   * Mahsulot birinchi renderda null bo'lib, keyin kelganda hooklar soni
   * o'zgarardi va React "Rendered more hooks than during the previous
   * render" bilan yiqilardi — ya'ni taom bosilganda oyna ochilmasdi.
   */
  it("mahsulot keyin kelganda hooklar tartibi buzilmaydi", () => {
    const onAddToCart = vi.fn();
    const onClose = vi.fn();
    const tree = (p: DBProduct | null) => (
      <LanguageProvider>
        <ProductModifierModal product={p} onAddToCart={onAddToCart} onClose={onClose} />
      </LanguageProvider>
    );

    const { rerender } = render(tree(null));
    expect(screen.queryByText('Osh')).toBeNull();

    rerender(tree(osh));
    expect(screen.getByText('Osh')).toBeInTheDocument();
  });

  it("o'lcham va qo'shimcha narxni qo'shadi va variantni obyekt bo'lib uzatadi", () => {
    const { onAddToCart, onClose } = renderModal();

    /*
     * Narx `toLocaleString()` bilan chiqadi, ya'ni ajratuvchi muhitga
     * bog'liq: brauzerda "30 000", Node'da esa "30,000" bo'lishi mumkin.
     * Shu sababli kutilmani ham o'sha funksiyadan olamiz.
     */
    const som = (v: number) => new RegExp(v.toLocaleString());

    // Boshlang'ich holat: birinchi o'lcham (Standart) tanlangan.
    expect(screen.getAllByText(som(30_000)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Katta/ }));
    fireEvent.click(screen.getByRole('button', { name: /Qazi/ }));

    // 40 000 (Katta) + 10 000 (Qazi)
    expect(screen.getAllByText(som(50_000)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: new RegExp(uz('modifier.addToCart')) }));

    expect(onAddToCart).toHaveBeenCalledTimes(1);
    const [product, note, variant, takeaway] = onAddToCart.mock.calls[0];
    expect(product.name).toBe('Osh (Katta)');
    expect(product.price).toBe(50_000);
    expect(variant).toEqual({ name: 'Katta', price: 40_000 });
    expect(note).toBe('+ Qazi');
    expect(takeaway).toBe(false);
    expect(onClose).toHaveBeenCalled();
  });

  it("saboy belgisi va izoh chekka birga uzatiladi", () => {
    const { onAddToCart } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: new RegExp(uz('modifier.takeaway')) }));
    fireEvent.change(screen.getByPlaceholderText(uz('modifier.note')), {
      target: { value: "achchiq bo'lmasin" },
    });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(uz('modifier.addToCart')) }));

    const [, note, , takeaway] = onAddToCart.mock.calls[0];
    expect(takeaway).toBe(true);
    expect(note).toBe("achchiq bo'lmasin");
  });

  it("izohsiz va qo'shimchasiz holatda note uzatilmaydi", () => {
    const { onAddToCart } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: new RegExp(uz('modifier.addToCart')) }));

    const [product, note, variant] = onAddToCart.mock.calls[0];
    expect(product.name).toBe('Osh (Standart)');
    expect(product.price).toBe(30_000);
    expect(note).toBeUndefined();
    expect(variant).toEqual({ name: 'Standart', price: 30_000, isBase: true });
  });
});
