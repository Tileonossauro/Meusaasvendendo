/** @type {import('next').NextConfig} */
export default {
  webpack: (config) => {
    // Nosso core usa a convencao ESM do TypeScript (imports terminam em ".js",
    // resolvidos para ".ts"). tsx e vitest entendem isso nativamente; o webpack
    // precisa deste alias. Mantem UM codigo compartilhado entre core e interface.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};
