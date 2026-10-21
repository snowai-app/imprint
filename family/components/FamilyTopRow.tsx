import AppLauncher from './AppLauncher';
import FamilyBar from './FamilyBar';
import { askEndpointOf } from '../ask-snow';
import type { LauncherApp } from '../apps';

/**
 * THE FAMILY'S TOP ROW, ONE PIECE FOR EVERY APP (operator, 21 October 2026,
 * T-3430, T-3431: "I thought this was supposed to be the standard across the
 * board"). The band above an app's own header: the nine dots (AppLauncher),
 * then the kit's bar (FamilyBar): the account, the person's pinned apps
 * (right-click in the nine dots to add, on a tile to remove, or drag), Ask,
 * the language and the account menu. A press on an app goes to the app
 * itself, in this tab (T-3422).
 *
 * Marked `data-fam-chrome`, so the app framed elsewhere does not draw it.
 * Drawn in the app's own colours through the kit's tokens (`data-app` on
 * <html>): `.fam-row` in components.css reads --accent and --accent-strong,
 * so an app mounts it and does nothing else. The CRM, Engage and Sign keep
 * their own bands, which restate the same bar in their own stylesheets.
 *
 * Plain data in, so a server component can call it: `apps` from
 * launcherApps (made on the server, so the operator's own surfaces never
 * reach a customer's page), `email` from the app's own session (null when
 * nobody is signed in), `company` the account's name where the app has one
 * (else the person's own, from the email).
 */
export default function FamilyTopRow({
  apps,
  current,
  snowai,
  shelfHref,
  owned = [current],
  company,
  email = null,
  ask,
  suggest = [],
}: {
  apps: LauncherApp[];
  current: string;
  snowai: string;
  shelfHref?: string;
  owned?: string[];
  company?: string;
  email?: string | null;
  ask?: string;
  suggest?: string[];
}) {
  const name = company ?? (email ? email.split('@')[0] : 'Snow AI');
  return (
    <div className="fam-row" data-fam-chrome>
      <AppLauncher apps={apps} owned={owned} current={current} shelfHref={shelfHref} snowai={snowai} />
      <FamilyBar apps={apps} current={current} snowai={snowai} company={name} email={email} ask={ask ?? askEndpointOf(apps) ?? ''} suggest={suggest} />
    </div>
  );
}
