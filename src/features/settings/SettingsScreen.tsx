import { useEffect, useRef, useState } from 'react';
import type { MessageKey } from '../../types';
import { useI18n } from '../../shared/i18n/i18n';
import { IconButton } from '../../shared/ui/IconButton';
import { AboutPage } from './AboutPage';
import { AccentSection } from './AccentSection';
import { AppearanceSection } from './AppearanceSection';
import { BackIcon } from './BackIcon';
import { DurationsSection } from './DurationsSection';
import { GoalSection } from './GoalSection';
import { InstallSection } from './InstallSection';
import { LanguageSection } from './LanguageSection';
import { LegalPage } from './LegalPage';
import { MethodPage } from './MethodPage';
import { PagesSection, type SubPage } from './PagesSection';
import { SoundSection } from './SoundSection';
import styles from './SettingsScreen.module.css';

export interface SettingsScreenProps {
  onClose(): void;
}

type Page = 'root' | SubPage;

const TITLES: Record<Page, MessageKey> = {
  root: 'settings.title',
  method: 'method.title',
  about: 'about.title',
  legal: 'legal.title',
};

export function SettingsScreen({ onClose }: SettingsScreenProps): JSX.Element {
  const { t } = useI18n();
  const [page, setPage] = useState<Page>('root');
  const title = useRef<HTMLHeadingElement>(null);

  // The pane swaps its whole content, so focus has to follow it.
  useEffect(() => {
    title.current?.focus();
  }, [page]);

  const goBack = (): void => {
    if (page === 'root') onClose();
    else setPage('root');
  };

  return (
    <section className={styles.settings} aria-label={t('settings.title')}>
      <header className={styles.header}>
        <IconButton className={styles.back} label={t('a11y.back')} onClick={goBack}>
          <BackIcon />
        </IconButton>
        <h2 className={styles.heading} ref={title} tabIndex={-1}>
          {t(TITLES[page])}
        </h2>
      </header>

      <div className={styles.column}>
        {page === 'root' ? (
          <>
            <AppearanceSection />
            <AccentSection />
            <DurationsSection />
            <GoalSection />
            <LanguageSection />
            <SoundSection />
            <InstallSection />
            <PagesSection onOpen={setPage} />
            <p className={styles.version}>{t('settings.version', { version: __APP_VERSION__ })}</p>
          </>
        ) : null}
        {page === 'method' ? <MethodPage /> : null}
        {page === 'about' ? <AboutPage /> : null}
        {page === 'legal' ? <LegalPage /> : null}
      </div>
    </section>
  );
}
