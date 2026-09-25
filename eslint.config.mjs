import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default [
  ...nextCoreWebVitals,
  {
    ignores: ["**/.next/**", "**/dist/**", "**/dist-ssr/**", "**/coverage/**", "**/out/**", "**/build/**"],
  },
  {
    files: ["apps/api/**/*.{js,jsx,ts,tsx}"],
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
];
