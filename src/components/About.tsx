import type { FC } from 'react';
import type React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { FaGithub } from 'react-icons/fa';
import packageJSON from '../../package.json';

declare global {
  const COMMIT_HASH: string;
}

const Link: FC<{ href: string; children?: React.ReactNode }> = ({
  href,
  children
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary-700 transition hover:text-primary-500 dark:text-primary-300 hover:dark:text-primary-500"
  >
    {children}
  </a>
);

export const About: FC = () => {
  const { t, i18n } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col">
        <h1 className="text-4xl font-bold">{t('header.title')}</h1>
        <div className="flex items-baseline gap-4">
          <h2 className="text-xl text-stone-700 dark:text-stone-300">
            {packageJSON.version}
          </h2>
          <h3 className="truncate font-mono text-sm text-stone-600 dark:text-stone-400">
            {COMMIT_HASH}
          </h3>
        </div>
      </div>
      <div className="flex">
        <Link href="https://github.com/sava110/mahjong-calc">
          <div className="flex items-center gap-2">
            <FaGithub size="1.8rem" />
            GitHub
          </div>
        </Link>
      </div>
      <p>
        &copy; <Link href="https://livewing.net/">livewing.net</Link>
      </p>
      <p>
        <Link href="https://github.com/livewing/mahjong-calc/blob/main/LICENSE">
          The MIT License
        </Link>
      </p>
      <p>
        <Trans i18n={i18n} i18nKey="footer.credit">
          {''}
          <Link href="https://github.com/FluffyStuff/riichi-mahjong-tiles" />
          <Link href="https://github.com/FluffyStuff/riichi-mahjong-tiles/blob/master/LICENSE.md" />
        </Trans>
      </p>
      <p>
        <Trans i18n={i18n} i18nKey="footer.credit-font">
          {''}
          <Link href="https://www.keshikan.net/fonts.html" />
          <Link href="https://github.com/sava110/mahjong-calc/blob/main/src/fonts/dseg/LICENSE.txt" />
        </Trans>
      </p>
    </div>
  );
};
