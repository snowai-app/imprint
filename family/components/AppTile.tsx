import { appById, type GlyphName } from '../apps';
import { GLYPHS, STROKE } from '../glyphs';

export type TileSize = 24 | 32 | 40 | 56;

/**
 * An app's tile (family standard 3.5): a rounded square at 25%, filled with
 * the app's one colour from palette.json, a white Lucide glyph at 55%, no
 * border. The colour comes from app-colours.css through `data-tile`, so a
 * page can draw any app's tile whatever app it is itself.
 *
 * Decorative by default: the app's name is always written beside it. Pass
 * `label` where the tile stands alone.
 */
export default function AppTile({
  app,
  size = 40,
  glyph,
  label,
  className,
}: {
  app: string;
  size?: TileSize;
  /** Overrides the app's own glyph, for a surface that is not in apps.ts. */
  glyph?: GlyphName;
  label?: string;
  className?: string;
}) {
  const Glyph = GLYPHS[glyph ?? appById(app)?.glyph ?? 'snowflake'];
  return (
    <span
      className={`fam-tile fam-tile--${size}${className ? ` ${className}` : ''}`}
      data-tile={app}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Glyph strokeWidth={STROKE} aria-hidden />
    </span>
  );
}
