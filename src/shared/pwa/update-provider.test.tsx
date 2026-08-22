import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '../../types';
import { UpdateBanner } from '../../app/UpdateBanner';
import { UpdateSection } from '../../features/settings/UpdateSection';
import { I18nProvider } from '../i18n/i18n';
import { SettingsProvider } from '../settings/settings-provider';
import { hardReload } from './hard-reload';
import { UpdateProvider } from './update-provider';

vi.mock('./hard-reload', () => ({ hardReload: vi.fn() }));

// The virtual module is inert under vitest, so the worker it stands for is
// played here: a registration whose update() the test can watch, and a
// needRefresh the test can raise the way a new worker would.
const sw = vi.hoisted(() => ({
  registration: null as { update: () => Promise<void> } | null,
  updateServiceWorker: vi.fn(() => Promise.resolve()),
  raise: null as ((value: boolean) => void) | null,
}));

vi.mock('virtual:pwa-register/react', async () => {
  const { useEffect, useState } = await import('react');
  return {
    useRegisterSW: (options?: {
      onRegisteredSW?: (url: string, registration: unknown) => void;
    }) => {
      const [needRefresh, setNeedRefresh] = useState(false);
      sw.raise = setNeedRefresh;
      // Le vrai hook n'annonce l'enregistrement qu'une fois : la doublure aussi.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      useEffect(() => void options?.onRegisteredSW?.('/sw.js', sw.registration ?? undefined), []);
      return {
        needRefresh: [needRefresh, setNeedRefresh],
        offlineReady: [false, () => undefined],
        updateServiceWorker: sw.updateServiceWorker,
      };
    },
  };
});

function renderApp() {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, lang: 'en' }));
  return render(
    <SettingsProvider>
      <I18nProvider>
        <UpdateProvider>
          <UpdateSection />
          <UpdateBanner />
        </UpdateProvider>
      </I18nProvider>
    </SettingsProvider>,
  );
}

function newVersionShipped(): void {
  act(() => sw.raise?.(true));
}

beforeEach(() => {
  localStorage.clear();
  sw.updateServiceWorker.mockClear();
  vi.mocked(hardReload).mockClear();
  sw.registration = { update: vi.fn(() => Promise.resolve()) };
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('while nothing has shipped', () => {
  it('says nothing at all', () => {
    renderApp();

    expect(screen.queryByText('A new version is ready.')).toBeNull();
    expect(screen.getByRole('button', { name: 'check' })).toBeEnabled();
  });

  it('asks the worker when the check is asked for, and reports back', async () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'check' }));

    expect(sw.registration?.update).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'checking…' })).toBeDisabled();

    // The answer only counts once a worker that was found has had time to install.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(screen.getByRole('button', { name: 'up to date' })).toBeDisabled();
    expect(screen.queryByText('A new version is ready.')).toBeNull();
  });

  it('asks again on its own when the app comes back on screen', () => {
    renderApp();

    act(() => void document.dispatchEvent(new Event('visibilitychange')));

    expect(sw.registration?.update).toHaveBeenCalledTimes(1);

    // Twice in a row is the same return: it does not ask again straight away.
    act(() => void document.dispatchEvent(new Event('visibilitychange')));
    expect(sw.registration?.update).toHaveBeenCalledTimes(1);
  });

  it('asks again on its own after an hour open', () => {
    renderApp();

    act(() => void vi.advanceTimersByTime(60 * 60 * 1000));

    expect(sw.registration?.update).toHaveBeenCalledTimes(1);
  });
});

describe('once a new version is ready', () => {
  it('says so, and offers the reload in two places', () => {
    renderApp();
    newVersionShipped();

    expect(screen.getByText('A new version is ready.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'reload' })).toHaveLength(2);
  });

  it('takes it only when asked', () => {
    renderApp();
    newVersionShipped();

    expect(sw.updateServiceWorker).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole('button', { name: 'reload' })[0] as HTMLElement);

    // `false`: the worker is asked to take over, and the page is reloaded here —
    // workbox's own reload does not fire on a page that was already controlled.
    expect(sw.updateServiceWorker).toHaveBeenCalledWith(false);
  });

  it('brings the page back once the worker has taken over', async () => {
    const listeners: Record<string, () => void> = {};
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: {
        addEventListener: (type: string, listener: () => void) => void (listeners[type] = listener),
        removeEventListener: () => undefined,
      },
    });
    const reload = vi.mocked(hardReload);

    renderApp();
    newVersionShipped();
    fireEvent.click(screen.getAllByRole('button', { name: 'reload' })[0] as HTMLElement);

    expect(reload).not.toHaveBeenCalled();

    act(() => listeners.controllerchange?.());
    expect(reload).toHaveBeenCalledTimes(1);

    // The fallback exists for the worker that never announces itself; once the
    // page has been sent back it must not fire a second time.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    expect(reload).toHaveBeenCalledTimes(1);

    Reflect.deleteProperty(window.navigator, 'serviceWorker');
  });

  it('brings the page back anyway when nothing announces itself', async () => {
    const reload = vi.mocked(hardReload);

    renderApp();
    newVersionShipped();
    fireEvent.click(screen.getAllByRole('button', { name: 'reload' })[0] as HTMLElement);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('lets the banner be dismissed without losing the way back', () => {
    renderApp();
    newVersionShipped();

    fireEvent.click(screen.getByRole('button', { name: 'later' }));

    expect(screen.queryByText('A new version is ready.')).toBeNull();
    // The settings still hold it: closing a banner is not refusing the version.
    expect(screen.getByRole('button', { name: 'reload' })).toBeInTheDocument();
  });

  it('never reports up to date while a version is waiting', async () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'check' }));
    newVersionShipped();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(screen.queryByRole('button', { name: 'up to date' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'reload' })).toHaveLength(2);
  });
});

describe('without a service worker at all', () => {
  it('still answers the check rather than hanging on it', async () => {
    sw.registration = null;
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'check' }));

    expect(screen.getByRole('button', { name: 'up to date' })).toBeInTheDocument();
  });
});
