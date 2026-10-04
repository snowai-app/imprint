import { FAMILY_LINKS } from '@/lib/links';

/* WHERE THE FRONT PAGE'S LINKS GO (T-2131). Imprint's own pages by path; every
   family address from lib/links.ts, which reads each app's variable with the real
   address as its default, so no hostname is written into the page. */
const env = (name: string, fallback: string): string => {
  const v = process.env[name];
  return (v && v.trim() ? v.trim() : fallback).replace(/\/+$/, '');
};

const hostOf = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

export function frontLinks() {
  const front = FAMILY_LINKS.snowai;
  return {
    /* Signed out, the proxy sends /studio to the family sign-in and back; signed
       in, it is the studio. */
    studio: '/studio',
    byline: FAMILY_LINKS.byline,
    playbook: FAMILY_LINKS.playbook,
    pitch: FAMILY_LINKS.pitch,
    model: FAMILY_LINKS.model,
    documents: FAMILY_LINKS.documents,
    home: front,
    products: `${front}/products`,
    pricing: `${front}/pricing`,
    privacy: `${front}/privacy`,
    terms: `${front}/terms`,
    support: env('NEXT_PUBLIC_SUPPORT_EMAIL', 'support@snowai.app'),
    /* The replicas show these as their address bars. */
    hosts: { imprint: hostOf(FAMILY_LINKS.imprint) },
  };
}
