import ThemeSwitch from '@/family/components/ThemeSwitch';
import { THEME_COOKIE } from '@/lib/theme';

/** The band across the top of the public front page: Imprint's name, and whatever the page puts on the right. (The studio has its own, in StudioShell.) */
export function Bar({ right }: { right?: React.ReactNode }) {
  return (
    <header className="band">
      <a className="name" href="/">
        <i aria-hidden="true" />
        Imprint <small>by Snow AI</small>
      </a>
      <span className="crumb" />
      <div className="acts">
        {right}
      </div>
      <ThemeSwitch cookie={THEME_COOKIE} className="theme-switch" />
    </header>
  );
}
