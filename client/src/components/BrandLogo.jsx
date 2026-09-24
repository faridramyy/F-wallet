/*
  import.meta.env.BASE_URL resolves to /icon.png locally and
  /F-wallet/icon.png on GitHub Pages without either being hardcoded.
  Decorative next to the "F-Wallet" wordmark it always sits beside, so
  it's hidden from screen readers rather than read out twice.
*/

export default function BrandLogo({ small = false }) {
  const size = small ? 32 : 38;

  return (
    <img
      src={`${import.meta.env.BASE_URL}icon.png`}
      alt=""
      aria-hidden="true"
      className="block shrink-0 rounded-xl object-cover"
      width={size}
      height={size}
    />
  );
}
