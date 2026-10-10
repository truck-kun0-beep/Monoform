import { notFound } from "next/navigation";
import Link from "next/link";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Container, PageHeader, Section } from "@/components/ui";

/**
 * `/docs/[slug]` — in-app documentation viewer.
 *
 * Serves the project's internal setup guides (Markdown) from the
 * `docs/` directory. The slug is uppercase by convention
 * (`/docs/AUTH`, `/docs/ORDERS`, …) and is matched case-insensitively
 * to the file basename. Unknown slugs return a 404.
 *
 * Rendering is intentionally conservative: the Markdown is parsed
 * into a small, safe subset (headings, paragraphs, lists, fenced
 * code blocks, tables and inline code) with all HTML escaped on
 * the way in. No third-party Markdown library is required.
 */

const DOC_FILES: Record<string, string> = {
  AUTH: "AUTH.md",
  ORDERS: "ORDERS.md",
  ACCOUNT: "ACCOUNT.md",
  ADMIN: "ADMIN.md",
  "FIRST-ADMIN": "FIRST-ADMIN.md",
  MEDIA: "MEDIA.md",
  "BUSINESS-INFO": "BUSINESS-INFO.md",
};

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return Object.keys(DOC_FILES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const key = slug.toUpperCase();
  if (!DOC_FILES[key]) {
    return { title: "Documentation Not Found" };
  }
  return { title: `${key} guide` };
}

export default async function DocsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const key = slug.toUpperCase();
  const filename = DOC_FILES[key];
  if (!filename) notFound();

  const docsRoot = path.join(process.cwd(), "docs");
  const filepath = path.join(docsRoot, filename);
  // Defensive: make sure the resolved file stays inside the docs
  // directory (no path-traversal).
  if (!filepath.startsWith(docsRoot + path.sep)) notFound();

  let raw: string;
  try {
    raw = await fs.readFile(filepath, "utf8");
  } catch {
    notFound();
  }

  const blocks = renderMarkdown(raw);

  return (
    <Section spacing="lg" tone="paper">
      <Container className="max-w-prose">
        <PageHeader
          eyebrow="Documentation"
          title={`${key} guide`}
          description="Internal setup guide for the store owner and developers."
        />
        <article className="prose-doc mt-10 space-y-5 text-sm text-ink-muted">
          {blocks.map((block, index) => (
            <BlockNode key={index} block={block} />
          ))}
        </article>
        <p className="mt-12 border-t border-line pt-6 text-xs text-ink-muted">
          <Link href="/" className="link-underline text-ink">
            Return to the store
          </Link>
        </p>
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------------ *
 * Lightweight Markdown renderer
 * ------------------------------------------------------------------ */

type Block =
  | { kind: "heading"; level: 1 | 2 | 3 | 4; text: string; id: string }
  | { kind: "paragraph"; inlines: Inline[] }
  | { kind: "list"; ordered: boolean; items: Inline[][] }
  | { kind: "code"; lang: string; body: string }
  | { kind: "table"; header: string[]; rows: string[][] };

type Inline = { kind: "text"; value: string } | { kind: "code"; value: string };

function renderInline(text: string): Inline[] {
  const out: Inline[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const codeStart = text.indexOf("`", cursor);
    if (codeStart === -1) {
      out.push({ kind: "text", value: text.slice(cursor) });
      break;
    }
    if (codeStart > cursor) {
      out.push({ kind: "text", value: text.slice(cursor, codeStart) });
    }
    const codeEnd = text.indexOf("`", codeStart + 1);
    if (codeEnd === -1) {
      out.push({ kind: "text", value: text.slice(codeStart) });
      break;
    }
    out.push({
      kind: "code",
      value: text.slice(codeStart + 1, codeEnd),
    });
    cursor = codeEnd + 1;
  }
  return out;
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function renderMarkdown(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // Skip blank lines.
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Fenced code block.
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").startsWith("```")) {
        body.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) i += 1; // skip closing ```
      blocks.push({ kind: "code", lang, body: body.join("\n") });
      continue;
    }

    // Heading.
    const heading = /^(#{1,4})\s+(.+?)\s*$/.exec(line);
    if (heading) {
      const level = heading[1]!.length as 1 | 2 | 3 | 4;
      const text = heading[2]!;
      blocks.push({
        kind: "heading",
        level,
        text,
        id: slugifyHeading(text),
      });
      i += 1;
      continue;
    }

    // List.
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: Inline[][] = [];
      while (i < lines.length) {
        const cur = lines[i] ?? "";
        if (ordered) {
          const m = /^\s*\d+\.\s+(.+)$/.exec(cur);
          if (!m) break;
          items.push(renderInline(m[1]!));
          i += 1;
        } else {
          const m = /^\s*[-*]\s+(.+)$/.exec(cur);
          if (!m) break;
          items.push(renderInline(m[1]!));
          i += 1;
        }
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }

    // Table.
    if (line.includes("|") && i + 1 < lines.length) {
      const next = lines[i + 1] ?? "";
      if (/^\s*\|?[\s\-:|]+\|?\s*$/.test(next)) {
        const header = splitTableRow(line);
        i += 2; // skip header + separator
        const rows: string[][] = [];
        while (i < lines.length) {
          const cur = lines[i] ?? "";
          if (!cur.includes("|")) break;
          rows.push(splitTableRow(cur));
          i += 1;
        }
        blocks.push({ kind: "table", header, rows });
        continue;
      }
    }

    // Paragraph: collect until blank line.
    const buf: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() !== "" &&
      !/^(#{1,4})\s+/.test(lines[i] ?? "") &&
      !/^\s*[-*]\s+/.test(lines[i] ?? "") &&
      !/^\s*\d+\.\s+/.test(lines[i] ?? "") &&
      !(lines[i] ?? "").startsWith("```")
    ) {
      buf.push(lines[i] ?? "");
      i += 1;
    }
    blocks.push({ kind: "paragraph", inlines: renderInline(buf.join(" ")) });
  }

  return blocks;
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

function BlockNode({ block }: { block: Block }) {
  if (block.kind === "heading") {
    const cls =
      block.level === 1
        ? "text-display-md text-ink"
        : block.level === 2
        ? "text-display-sm text-ink"
        : "text-base font-medium text-ink";
    const Tag = `h${block.level}` as "h1" | "h2" | "h3" | "h4";
    return (
      <Tag id={block.id} className={cls}>
        {block.text}
      </Tag>
    );
  }
  if (block.kind === "paragraph") {
    return (
      <p className="leading-relaxed">
        {block.inlines.map((node, i) => (
          <InlineNode key={i} node={node} />
        ))}
      </p>
    );
  }
  if (block.kind === "list") {
    const Tag = block.ordered ? "ol" : "ul";
    return (
      <Tag
        className={
          block.ordered
            ? "list-decimal space-y-1 pl-5"
            : "list-disc space-y-1 pl-5"
        }
      >
        {block.items.map((item, i) => (
          <li key={i}>
            {item.map((node, j) => (
              <InlineNode key={j} node={node} />
            ))}
          </li>
        ))}
      </Tag>
    );
  }
  if (block.kind === "code") {
    return (
      <pre className="overflow-x-auto border border-line bg-paper-warm p-4 text-xs leading-relaxed text-ink">
        <code>{block.body}</code>
      </pre>
    );
  }
  // table
  return (
    <div className="overflow-x-auto">
      <table className="w-full border border-line text-left text-sm">
        <thead>
          <tr className="bg-paper-warm">
            {block.header.map((cell, i) => (
              <th
                key={i}
                className="border-b border-line px-3 py-2 font-normal text-ink"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, i) => (
            <tr key={i} className="border-b border-line last:border-b-0">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 align-top text-ink-muted">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InlineNode({ node }: { node: Inline }) {
  if (node.kind === "code") {
    return (
      <code className="border border-line bg-paper-warm px-1.5 py-0.5 font-mono text-[12px] text-ink">
        {node.value}
      </code>
    );
  }
  return <>{node.value}</>;
}
