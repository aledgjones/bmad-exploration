import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import RootLayout, { metadata } from '../app/layout';
import React from 'react';

// mock next font imports which are not usable in JSDOM
vi.mock('next/font/google', () => ({
  Geist: (opts: any) => ({ variable: '--font-geist' }),
  Geist_Mono: (opts: any) => ({ variable: '--font-geist-mono' }),
}));

describe('RootLayout component', () => {
  it('renders children and applies font classes', () => {
    render(
      <RootLayout>
        <div data-testid="child">child content</div>
      </RootLayout>
    );
    const child = screen.getByTestId('child');
    expect(child).toBeInTheDocument();
    const body = document.querySelector('body');
    expect(body).not.toBeNull();
    // class list should include the css variables (they start with --font)
    expect(body?.className).toMatch(/--font/);
  });

  it('exports metadata object with expected fields', () => {
    expect(metadata).toHaveProperty('title');
    expect(metadata).toHaveProperty('description');
  });
});
