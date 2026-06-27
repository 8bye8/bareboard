import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    vue(),
    dts({ rollupTypes: true }),
    {
      name: 'serve-dev-wasm',
      // This hook only runs during 'npm run dev' (development)
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/generator.wasm' || req.url === '/wasm_exec.js') {
            const filePath = resolve(__dirname, 'dev-assets', req.url.slice(1))

            if (fs.existsSync(filePath)) {
              // Set correct mime types so the browser compiles WASM correctly
              const mimeType = req.url.endsWith('.wasm') ? 'application/wasm' : 'application/javascript'
              res.setHeader('Content-Type', mimeType)

              fs.createReadStream(filePath).pipe(res)
              return
            }
          }
          next()
        })
      }
    }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Bareboard',
      fileName: 'bareboard'
    }
  },
})