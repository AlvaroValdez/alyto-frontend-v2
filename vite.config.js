import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs    from 'fs'
import path  from 'path'
import { revisarEntorno } from './scripts/requiredEnv.js'

export default defineConfig(({ mode }) => {
  // Carga TODAS las variables del .env (con y sin prefijo VITE_)
  const env = loadEnv(mode, process.cwd(), '')

  // ── Barrera: no permitir una compilacion de produccion sin API ────────────
  //
  // `src/services/api.js` tiene este respaldo:
  //     VITE_API_URL ?? 'http://localhost:3000/api/v1'
  // que es correcto en desarrollo y CATASTROFICO en un binario publicado: la
  // app queda hablando con el propio telefono y NADIE puede iniciar sesion,
  // sin ningun error visible en el servidor porque las peticiones no salen.
  //
  // Paso de verdad: el versionCode 3 se publico en Google Play apuntando a
  // localhost. Se compilo en un arbol limpio y `.env.production`, que tiene la
  // URL buena, esta en .gitignore, asi que no existia alli. Vite no avisa de una
  // variable ausente, simplemente la deja sin definir.
  //
  // Compilar Android NO pasa por docker-compose, que es donde viven los build
  // args del despliegue web, de modo que ese camino no estaba cubierto por nada.
  // La comprobacion vive AQUI y no solo en `npm run check:production` porque ese
  // script lo encadena `build:production`, mientras que el binario de Android se
  // construye con `cap:sync`, que llama a `build` a secas. El camino por el que
  // sale la app era justo el unico sin verificar.
  //
  // Ademas `loadEnv` resuelve la precedencia real (.env, .env.production,
  // .env.local...), cosa que checkProduction.js no hace: ese lee solo
  // .env.production y no ve que un valor VACIO ahi anula el bueno de .env. Asi
  // se estuvo a punto de publicar un binario sin Firebase ni Sentry.
  if (mode === 'production') {
    const problemas = revisarEntorno(env)
    if (problemas.length) {
      throw new Error(
        '\n\n  Compilacion de produccion detenida: ' +
        `${problemas.length} variable(s) de entorno sin valor valido.\n\n` +
        problemas.map(p => `    ${p.key} — ${p.motivo}\n      ${p.hint}`).join('\n') +
        '\n\n  El binario saldria roto y sin aviso: sin VITE_API_URL queda apuntando\n' +
        '  a http://localhost:3000 y no puede entrar nadie.\n\n' +
        '  Copia el .env.production del repositorio al directorio de compilacion:\n' +
        '    cp /ruta/al/repo/.env.production .\n\n'
      );
    }
  }

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
