// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TwentyQuestions from './TwentyQuestions';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('20 Questions UI against the computer', () => {
  it('the computer asks a question, the human answers, and the log grows', () => {
    vi.useFakeTimers();
    render(<TwentyQuestions />);
    fireEvent.click(screen.getByText('Vs Computer'));
    fireEvent.click(screen.getByText(/ready/i));
    expect(screen.getByText(/Turns used: 0\/20/)).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/Turns used: 1\/20/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'No' }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/Turns used: 2\/20/)).toBeTruthy();
  });
});
