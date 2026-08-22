import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INTRO_STORAGE_KEY, SESSIONS_STORAGE_KEY } from '../types';
import { App } from './App';
import { Providers } from './providers';

function speaks(...languages: string[]): void {
  Object.defineProperty(window.navigator, 'languages', { value: languages, configurable: true });
}

function renderApp() {
  return render(
    <Providers>
      <App />
    </Providers>,
  );
}

beforeEach(() => {
  localStorage.clear();
  speaks('en-US');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the first visit', () => {
  it('says what the app is before showing it', () => {
    renderApp();

    expect(
      screen.getByRole('heading', { name: 'A work timer that lets you leave.', level: 1 }),
    ).toBeInTheDocument();
    // The timer is not underneath: one screen, one thing to decide.
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.queryByRole('button', { name: 'settings' })).toBeNull();
  });

  it('answers in the language the visitor’s browser asks for', () => {
    speaks('fr-FR', 'en-US');
    renderApp();

    expect(
      screen.getByRole('heading', { name: 'Un minuteur de travail qui te laisse partir.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'commencer' })).toBeInTheDocument();
  });

  it('hands over to the timer, and does not come back', () => {
    const first = renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'start' }));

    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ready to start' })).toBeInTheDocument();
    expect(localStorage.getItem(INTRO_STORAGE_KEY)).toBe('1');

    first.unmount();
    renderApp();

    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /work timer/ })).toBeNull();
  });

  it('takes the curious straight to the method', () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'the method, and what the research says' }));

    expect(screen.getByRole('heading', { name: 'the method', level: 2 })).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(4);

    // Back once for the settings root, and the intro is behind us for good.
    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    expect(screen.getByRole('heading', { name: 'settings', level: 2 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('never greets someone who has been here before', () => {
    localStorage.setItem(
      SESSIONS_STORAGE_KEY,
      JSON.stringify({ version: 1, entries: [{ startedAt: 1, minutes: 25, mode: 'focus' }] }),
    );
    renderApp();

    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /work timer/ })).toBeNull();
  });
});

describe('the settings pane', () => {
  it('opens on its root from the gear, not on wherever it was left', () => {
    localStorage.setItem(INTRO_STORAGE_KEY, '1');
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'the method' }));
    expect(screen.getByRole('heading', { name: 'the method', level: 2 })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    fireEvent.click(screen.getByRole('button', { name: 'settings' }));

    expect(screen.getByRole('heading', { name: 'settings', level: 2 })).toBeInTheDocument();
  });
});
