import { appById } from '../apps';
import AppTile from './AppTile';

/**
 * THE FAMILY'S NOT-FOUND PAGE (T-2126), in place of Next's built-in 404,
 * which follows the device's dark setting and ignores the app's theme. This
 * one sits in the app's own colours, light unless the person chose dark: the
 * app's tile and name, "This page isn't here", and the way home.
 *
 * Used from app/not-found.tsx (templates/not-found.tsx is the file to copy).
 */
export default function NotFound({
  app,
  homeHref = '/',
  shelfHref,
}: {
  /** The app's id in apps.ts, the same as `data-app` on <html>. */
  app: string;
  homeHref?: string;
  /** The full shelf at snowai.app; left out where the app is the shelf. */
  shelfHref?: string;
}) {
  const found = appById(app);
  const name = found?.name ?? 'Snow AI';
  const short = found?.short ?? 'Snow AI';
  return (
    <main className="fam-notfound">
      <div className="fam-notfound__inner">
        <a className="fam-notfound__brand" href={homeHref}>
          <AppTile app={app} size={56} />
          <span>{name}</span>
        </a>
        <p className="fam-notfound__code">Error 404</p>
        <h1 className="fam-notfound__title">This page isn’t here</h1>
        <p className="fam-notfound__body">
          The address may be mistyped, or the page may have moved. Everything else is where you left it.
        </p>
        <div className="fam-notfound__links">
          <a className="fam-btn fam-btn--primary" href={homeHref}>
            Go to {short} home
          </a>
          {shelfHref ? (
            <a className="fam-btn" href={shelfHref}>
              All Snow AI apps
            </a>
          ) : null}
        </div>
      </div>
    </main>
  );
}
