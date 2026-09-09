/*
  The app logo, used in the sidebar, the mobile header and the login card.

  import.meta.env.BASE_URL is whatever Vite was built with, so this
  resolves to /icon.png locally and /F-wallet/icon.png on GitHub Pages
  without either being hardcoded.

  The image is decorative next to the "F-Wallet" wordmark it always sits
  beside, so the alt text is empty and it is hidden from screen readers
  rather than being read out twice.
*/

export default function BrandLogo({ small = false }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}icon.png`}
      alt=""
      aria-hidden="true"
      className={`brand-logo ${small ? "small" : ""}`}
      width={small ? 32 : 38}
      height={small ? 32 : 38}
    />
  );
}
