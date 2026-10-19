import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/** En `npm run dev` atiende /api/planificar igual que la función de Vercel (api/planificar.ts). */
function apiPlanificar(mode: string): Plugin {
  return {
    name: 'api-planificar',
    configureServer(server) {
      server.middlewares.use('/api/planificar', async (req, res) => {
        try {
          const { handlePlanRequest } = (await server.ssrLoadModule('/server/planificar.ts')) as typeof import('./server/planificar');
          const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
          const response = await handlePlanRequest(await toRequest(req), env);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          console.error(err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Error interno.' }));
        }
      });
    },
  };
}

async function toRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
  const method = req.method || 'GET';
  return new Request('http://localhost/api/planificar', { method, headers, body: method === 'GET' || method === 'HEAD' ? undefined : Buffer.concat(chunks) });
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), apiPlanificar(mode)],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'motion', test: /node_modules[\\/](motion|framer-motion|motion-dom|motion-utils)[\\/]/ },
            { name: 'firebase', test: /node_modules[\\/](firebase|@firebase)[\\/]/ },
          ],
        },
      },
    },
  },
}));
