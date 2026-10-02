import { getPublicConfig } from "@/infrastructure/get-public-config";
import { getTemplateServices } from "@/infrastructure/get-template-services";
import { InboxLab } from "@/presentation/components/inbox-lab/inbox-lab";

export default async function HomePage() {
  const templates = await getTemplateServices().listTemplates.execute();
  const { turnstileSiteKey } = getPublicConfig();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header>
        <p className="text-sm font-medium text-muted">WDNusantara</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Inbox Lab</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Hand-coded, responsive, accessible HTML email with dark mode support, built from one
          shared component library. NusaFlow, the product in these emails, is fictional.
        </p>
      </header>

      <InboxLab templates={templates} turnstileSiteKey={turnstileSiteKey} />
    </main>
  );
}
