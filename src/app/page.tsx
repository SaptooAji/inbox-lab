import { getTemplateServices } from "@/infrastructure/get-template-services";
import { TemplateExplorer } from "@/presentation/components/template-explorer/template-explorer";

export default async function HomePage() {
  const templates = await getTemplateServices().listTemplates.execute();

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

      <section aria-labelledby="templates-heading" className="mt-10">
        <h2 id="templates-heading" className="text-2xl font-semibold">
          Email templates
        </h2>
        <p className="mt-2 text-muted">
          Pick a template, then check it on desktop and mobile, in light and dark.
        </p>
        <div className="mt-6">
          <TemplateExplorer templates={templates} />
        </div>
      </section>
    </main>
  );
}
