import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useOnceOpened } from './useOnceOpened';

/** Hook natijasini matn qilib chiqaradigan kichik komponent. */
function Harness(props: { isOpen: boolean }) {
  const mounted = useOnceOpened(props.isOpen);
  return <div data-testid="out">{mounted ? 'mounted' : 'idle'}</div>;
}

describe('useOnceOpened', () => {
  it('hech ochilmagan bo\'lsa false qaytaradi', () => {
    render(<Harness isOpen={false} />);

    expect(screen.getByTestId('out').textContent).toBe('idle');
  });

  it('birinchi ochilishdayoq true qaytaradi', () => {
    const { rerender } = render(<Harness isOpen={false} />);

    rerender(<Harness isOpen />);

    expect(screen.getByTestId('out').textContent).toBe('mounted');
  });

  it('yopilgandan keyin ham true qoladi — ichki holat yo\'qolmasin', () => {
    const { rerender } = render(<Harness isOpen />);

    rerender(<Harness isOpen={false} />);

    expect(screen.getByTestId('out').textContent).toBe('mounted');
  });

  it('boshidan ochiq bo\'lsa birinchi renderdayoq true qaytaradi', () => {
    render(<Harness isOpen />);

    expect(screen.getByTestId('out').textContent).toBe('mounted');
  });
});
