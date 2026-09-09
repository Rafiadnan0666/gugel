import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.config({
    extends: ["next/core-web-vitals"],
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      // Data fetching inside useEffect is the standard pattern in this
      // codebase; the v7 "no setState in effect" rule flags every page.
      "react-hooks/set-state-in-effect": "off",
      // Experimental immutability rule — too strict for existing code.
      "react-hooks/immutability": "off",
    },
  }),
  {
    ignores: [".next/**"],
  },
];

export default eslintConfig;
