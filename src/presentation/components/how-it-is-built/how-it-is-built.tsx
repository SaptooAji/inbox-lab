import type { TemplateBuildMetrics } from "@/application/dto/build-metrics.dto";
import type { TemplateSummary } from "@/application/dto/template.dto";
import {
  budgetUsage,
  formatKilobytes,
  type BudgetStatus,
} from "@/presentation/build/build-metrics-view";

const STATUS_TEXT: Record<BudgetStatus, string> = {
  ok: "within budget",
  warning: "close to the limit",
  over: "over the limit, Gmail will clip it",
};

const QA_CHECKLIST: readonly string[] = [
  "Every image has alt text, or an empty alt when it is decorative. The build fails otherwise.",
  "Every page has a language, a title and a hidden preheader. The build fails otherwise.",
  "Layout tables are marked role=presentation so screen readers skip them.",
  "Every link is https, mailto, tel or a known merge tag. Unknown merge tags fail the build.",
  "The HTML stays under Gmail's 102 KB clip limit, with a warning at 80% of it.",
  "Text and background colors meet 4.5:1 contrast in light and in dark, checked by a test over the design tokens.",
  "An automated accessibility audit (axe) runs on every built email, light and dark, in the end-to-end tests.",
];

export interface HowItIsBuiltProps {
  readonly metrics: readonly TemplateBuildMetrics[];
  readonly templates: readonly TemplateSummary[];
}

export function HowItIsBuilt({ metrics, templates }: HowItIsBuiltProps) {
  return (
    <section aria-labelledby="built-heading" className="mt-16">
      <h2 id="built-heading" className="text-2xl font-semibold">
        How it is built
      </h2>
      <p className="mt-2 max-w-2xl text-muted">
        No email builder and no framework. The emails are hand-written HTML, assembled and checked
        by a small build step.
      </p>

      <h3 className="mt-8 text-lg font-semibold">Component library</h3>
      <p className="mt-2 max-w-2xl text-muted">
        Every template is made from the same HTML components, and every color, size and space comes
        from one set of design tokens. The build joins them, fills in the tokens, inlines the CSS,
        makes a plain text version and a simulated dark copy, then lints the result.
      </p>

      <h3 className="mt-8 text-lg font-semibold">QA checklist</h3>
      <ul aria-label="QA checklist items" className="mt-2 max-w-2xl list-disc space-y-1 pl-5">
        {QA_CHECKLIST.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h3 className="mt-8 text-lg font-semibold">Performance</h3>
      <p className="mt-2 max-w-2xl text-muted">
        Gmail clips any message larger than 102 KB and hides the rest behind a link. These sizes are
        measured from the built HTML files, after the CSS is inlined.
      </p>
      <table className="mt-4 w-full max-w-2xl text-left text-sm">
        <caption className="mb-2 text-left text-sm text-muted">Email size by template</caption>
        <thead>
          <tr>
            <th scope="col" className="py-2 pr-4 font-semibold">
              Template
            </th>
            <th scope="col" className="py-2 pr-4 font-semibold">
              HTML size
            </th>
            <th scope="col" className="py-2 font-semibold">
              Plain text size
            </th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => {
            const usage = budgetUsage(metric.htmlBytes);
            return (
              <tr key={metric.templateId} className="border-t border-border">
                <th scope="row" className="py-2 pr-4 font-medium">
                  {templates.find((template) => template.id === metric.templateId)?.name ??
                    metric.templateId}
                </th>
                <td className="py-2 pr-4">
                  {formatKilobytes(metric.htmlBytes)}{" "}
                  <span className="text-muted">
                    ({usage.percent}% of the limit, {STATUS_TEXT[usage.status]})
                  </span>
                </td>
                <td className="py-2">{formatKilobytes(metric.textBytes)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
