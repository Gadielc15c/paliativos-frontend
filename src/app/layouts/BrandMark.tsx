/** App mark: a soft rounded square with a heart-in-hand line. Decorative (the name sits next to it). */
export default function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20s-6.5-3.9-8.4-7.6C2.2 9.6 3.6 6.5 6.6 6.1c1.9-.2 3.6.8 4.4 2.3.8-1.5 2.5-2.5 4.4-2.3 3 .4 4.4 3.5 3 6.3C18.5 16.1 12 20 12 20z" />
      </svg>
    </span>
  );
}
