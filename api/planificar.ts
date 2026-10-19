// Función de Vercel: POST /api/planificar. La lógica vive en server/planificar.ts.
import { handlePlanRequest } from '../server/planificar.js';

export function POST(request: Request): Promise<Response> {
  return handlePlanRequest(request, process.env);
}
