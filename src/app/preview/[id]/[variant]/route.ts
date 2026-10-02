import { getTemplateServices } from "@/infrastructure/get-template-services";
import { handlePreview } from "@/presentation/http/handle-preview";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; variant: string }> },
): Promise<Response> {
  const { id, variant } = await context.params;
  return handlePreview(id, variant, () => getTemplateServices().getTemplate);
}
