import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function growByMediavinePlugin(siteId: string): Plugin {
  return {
    name: 'grow-by-mediavine',
    transformIndexHtml() {
      if (!siteId) {
        return []
      }

      return [
        {
          tag: 'script',
          attrs: {
            'data-grow-initializer': '',
          },
          children: `!(function(){window.growMe||((window.growMe=function(e){window.growMe._.push(e)}),(window.growMe._=[]));var e=document.createElement("script");e.type="text/javascript";e.src="https://faves.grow.me/main.js";e.defer=!0;e.setAttribute("data-grow-faves-site-id",${JSON.stringify(siteId)});var t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t)})();`,
          injectTo: 'head',
        },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [growByMediavinePlugin(env.VITE_GROW_SITE_ID ?? ''), react()],
  }
})
