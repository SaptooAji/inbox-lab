import { getContainer } from "@/infrastructure/get-container";
import { handleTestSend } from "@/presentation/http/handle-test-send";

export function POST(request: Request): Promise<Response> {
  return handleTestSend(request, getContainer);
}
