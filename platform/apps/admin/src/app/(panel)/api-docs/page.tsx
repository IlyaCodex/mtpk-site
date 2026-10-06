import type { Metadata } from 'next';
import { Badge, Card, PageHeader, type Tone } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { buildOpenApi } from '@/lib/openapi';

export const metadata: Metadata = { title: 'API' };

type Op = { tags?: string[]; summary?: string; parameters?: { name: string; in: string; required?: boolean; description?: string; schema?: { type?: string } }[]; requestBody?: unknown };

const METHOD_TONE: Record<string, Tone> = { get: 'blue', post: 'green', put: 'amber', delete: 'red' };

/**
 * Справочник REST API: методы админки (/api/v1/…) по разделам, с параметрами;
 * ниже — публичные методы сервисов. Машиночитаемое описание — /api/v1/openapi.
 */
export default async function ApiDocsPage() {
  await requireUser();
  const spec = await buildOpenApi();
  const groups = new Map<string, { path: string; method: string; op: Op }[]>();
  for (const [path, ops] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(ops as Record<string, Op>)) {
      const tag = op.tags?.[0] ?? 'Прочее';
      if (!groups.has(tag)) groups.set(tag, []);
      groups.get(tag)!.push({ path, method, op });
    }
  }

  return (
    <>
      <PageHeader
        title="REST API"
        description={
          <>
            {spec.info.description} Описание в формате OpenAPI 3:{' '}
            <a href="/api/v1/openapi" className="font-mono text-brand-600 hover:underline">
              /api/v1/openapi
            </a>{' '}
            — загружается в Postman или Swagger UI.
          </>
        }
      />
      <div className="space-y-6">
        {[...groups].map(([tag, ops]) => (
          <Card key={tag} title={tag}>
            <ul className="divide-y divide-slate-100">
              {ops.map(({ path, method, op }) => (
                <li key={`${method} ${path}`} className="py-2.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="w-16">
                      <Badge tone={METHOD_TONE[method] ?? 'gray'}>{method.toUpperCase()}</Badge>
                    </span>
                    <code className="font-mono text-sm text-slate-900">{path}</code>
                    <span className="text-sm text-slate-500">{op.summary}</span>
                  </div>
                  {!!op.parameters?.length && (
                    <div className="mt-1.5 ml-[76px] flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      {op.parameters.map((p) => (
                        <span key={`${p.in}:${p.name}`}>
                          <code className="text-slate-700">{p.name}</code>
                          {p.required ? '*' : ''} <span className="text-slate-400">({p.in})</span>
                          {p.description ? ` — ${p.description}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        ))}
        <Card title="Сервисы: публичные методы (для сайта)">
          <div className="grid gap-6 lg:grid-cols-2">
            {spec['x-services'].map((s) => (
              <div key={s.name}>
                <div className="font-medium text-slate-900">{s.title ?? s.name}</div>
                {s.description && <p className="mt-0.5 text-xs text-slate-500">{s.description}</p>}
                <ul className="mt-2 space-y-0.5 font-mono text-xs text-slate-700">
                  {s.public.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
