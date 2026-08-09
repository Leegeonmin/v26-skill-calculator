import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function mediavinePlugin({ growSiteId, scriptSrc }: { growSiteId: string; scriptSrc: string }): Plugin {
  return {
    name: 'mediavine',
    transformIndexHtml() {
      const tags = []

      if (growSiteId) {
        tags.push({
          tag: 'script',
          attrs: {
            'data-grow-initializer': '',
          },
          children: `!(function(){window.growMe||((window.growMe=function(e){window.growMe._.push(e)}),(window.growMe._=[]));var e=document.createElement("script");e.type="text/javascript";e.src="https://faves.grow.me/main.js";e.defer=!0;e.setAttribute("data-grow-faves-site-id",${JSON.stringify(growSiteId)});var t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t)})();`,
          injectTo: 'head' as const,
        })
      }

      if (scriptSrc) {
        tags.push({
          tag: 'script',
          attrs: {
            type: 'text/javascript',
            async: 'async',
            'data-noptimize': '1',
            'data-cfasync': 'false',
            src: scriptSrc,
          },
          injectTo: 'head' as const,
        })
      }

      return tags
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      mediavinePlugin({
        growSiteId: env.VITE_GROW_SITE_ID ?? '',
        scriptSrc: env.VITE_MEDIAVINE_SCRIPT_SRC ?? '',
      }),
      react(),
    ],
  }
})
