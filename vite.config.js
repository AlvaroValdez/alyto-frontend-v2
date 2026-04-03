import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs    from 'fs'
import path  from 'path'

export default defineConfig(({ mode }) => {
  // Carga TODAS las variables del .env (con y sin prefijo VITE_)
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),

      // ── Plugin: inyecta vars Firebase en el SW durante `vite dev` ──────
      // En producción la inyección la hace scripts/inject-firebase-sw.js
      // después del build. En desarrollo, este middleware sirve el SW con
      // los valores reemplazados al vuelo para cada request.
      {
        name: 'firebase-sw-inject',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url !== '/firebase-messaging-sw.js') return next()

            const swPath = path.resolve('public/firebase-messaging-sw.js')
            if (!fs.existsSync(swPath)) return next()

            let content = fs.readFileSync(swPath, 'utf8')

            const replacements = {
              'self.FIREBASE_API_KEY':             `"${env.VITE_FIREBASE_API_KEY             ?? ''}"`,
              'self.FIREBASE_AUTH_DOMAIN':         `"${env.VITE_FIREBASE_AUTH_DOMAIN         ?? ''}"`,
              'self.FIREBASE_PROJECT_ID':          `"${env.VITE_FIREBASE_PROJECT_ID          ?? ''}"`,
              'self.FIREBASE_STORAGE_BUCKET':      `"${env.VITE_FIREBASE_STORAGE_BUCKET      ?? ''}"`,
              'self.FIREBASE_MESSAGING_SENDER_ID': `"${env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? ''}"`,
              'self.FIREBASE_APP_ID':              `"${env.VITE_FIREBASE_APP_ID              ?? ''}"`,
            }

            for (const [k, v] of Object.entries(replacements)) {
              content = content.replaceAll(k, v)
            }

            res.setHeader('Content-Type', 'application/javascript')
            res.setHeader('Service-Worker-Allowed', '/')
            res.end(content)
          })
        },
      },
    ],

    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
    },

    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor:   ['react', 'react-dom', 'react-router-dom'],
            firebase: ['firebase/app', 'firebase/messaging'],
            sentry:   ['@sentry/react'],
          },
        },
      },
    },
  }
})
