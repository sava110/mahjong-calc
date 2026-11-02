import { type Plugin, loadEnv } from 'vite';

// Inserts og:url and og:image from VITE_SITE_URL (e.g. in .env.local).
// They are omitted when it is not set, since both must be absolute URLs.
const plugin = (): Plugin => {
  let siteUrl = '';
  return {
    name: 'site-url',
    configResolved: ({ mode, envDir, root }) => {
      const { VITE_SITE_URL = '' } = loadEnv(mode, envDir ?? root, 'VITE_');
      siteUrl = VITE_SITE_URL.replace(/\/+$/, '');
    },
    transformIndexHtml: () =>
      siteUrl === ''
        ? []
        : [
            {
              tag: 'meta',
              attrs: { property: 'og:url', content: `${siteUrl}/` },
              injectTo: 'head'
            },
            {
              tag: 'meta',
              attrs: { property: 'og:image', content: `${siteUrl}/ogp.png` },
              injectTo: 'head'
            }
          ]
  };
};
export default plugin;
