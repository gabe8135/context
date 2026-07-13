import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  { ignores: [".next/**", "out/**", "build/**", "dist/**", "coverage/**", "public/sw.js"] },
  {
    rules: {
      // Estes efeitos hidratam estado persistido do navegador ou sincronizam UI externa.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
