/** The 2×2 matrix mark used in the header, splash and sign-in screens. */
export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="9" height="9" rx="2.5" fill="var(--accent)" />
      <rect x="13" y="2" width="9" height="9" rx="2.5" fill="var(--accent)" opacity="0.45" />
      <rect x="2" y="13" width="9" height="9" rx="2.5" fill="var(--accent)" opacity="0.45" />
      <rect x="13" y="13" width="9" height="9" rx="2.5" fill="var(--accent)" opacity="0.2" />
    </svg>
  );
}
