import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: '.',
  plugins: [tailwindcss()],
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          vendor: ['chart.js', 'tabulator-tables'],
          ui: ['sweetalert2'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@services': resolve(__dirname, 'src/services'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@components': resolve(__dirname, 'src/components'),
      '@modules': resolve(__dirname, 'src/modules'),
      '@config': resolve(__dirname, 'src/config'),
      '@styles': resolve(__dirname, 'src/styles'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/app-modern/api.php': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => '/app' + path,
      },
      '/app-modern/server/router.php': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => '/app' + path,
      },
      '/app-modern/xlsx/': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => '/app' + path,
      },
      '/app-modern/pdfs/': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => '/app' + path,
      },
      '/app/app-modern/api.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/getPeriodos.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/geolocaliza.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/getasignacion.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/getYearsData.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/getInfoDocentes.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/getPeriodosNotas.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/getNotificaciones.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/getConcentrador.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/generarMenu.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/getNotas.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/guardar_notas.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/guardar_notas2.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/getMensaje.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/getNiveles.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/getNumeros.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/getValoraciones.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/getValoracionesAreas.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/getConcentradorAreas.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/consolidadoPerdidas.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/generaLista.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/getDataGraphAsignatura.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/getDataGraphAsignatura2.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/getDataGraphAsignatura3.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/app/app-modern/server/legacy/': {
        target: 'http://localhost',
        changeOrigin: true,
      },
    },
  },
});
