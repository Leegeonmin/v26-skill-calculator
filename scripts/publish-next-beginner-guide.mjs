import fs from "node:fs";

const queuePath = "content/beginner-guide-queue.json";
const infoPath = "src/views/InfoPageView.tsx";
const appPath = "src/App.tsx";
const prerenderPath = "scripts/prerender-public-pages.mjs";
const sitemapPath = "public/sitemap.xml";
const dryRun = process.argv.includes("--dry-run");

const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
let info = fs.readFileSync(infoPath, "utf8");

const next = queue.find((article) => !info.includes(`path: "${article.path}"`));

if (!next) {
  console.log("No unpublished beginner guide found.");
  process.exit(0);
}

const articleText = next.sections.map((section) => section.body).join("");
const charsNoSpace = [...articleText.replace(/\s+/g, "")].length;

if (charsNoSpace < 1300) {
  throw new Error(`${next.path} is too short: ${charsNoSpace} chars without spaces`);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildInfoPageEntry(article) {
  const sections = article.sections
    .map(
      (section) => `      {
        title: "${section.title}",
        body: (
          <p>
            ${section.body}
          </p>
        ),
      }`
    )
    .join(",\n");

  return `  ${article.key}: {
    eyebrow: "Beginner Guide",
    title: "${article.title}",
    description:
      "${article.description}",
    path: "${article.path}",
    sections: [
${sections},
    ],
  },
`;
}

function buildPrerenderEntry(article) {
  const sections = article.sections
    .map(
      (section) => `      {
        title: "${section.title}",
        body: "${section.body}",
      }`
    )
    .join(",\n");

  return `  {
    path: "${article.path}",
    title: "${article.title} | CPBV LAB",
    description:
      "${article.description}",
    heading: "${article.title}",
    intro: "뉴비 가이드에 하나씩 추가되는 기준 글입니다.",
    sections: [
${sections},
    ],
  },
`;
}

function ensureIncludes(source, needle, replacement) {
  return source.includes(needle) ? source : replacement(source);
}

info = ensureIncludes(info, `  | "${next.key}"`, (source) =>
  source.replace('  | "faq"', `  | "${next.key}"\n  | "faq"`)
);

const plainListItem = `            <li>${next.title}</li>`;
const linkedListItem = `            <li>
              <a href="${next.path}">${next.title}</a>
            </li>`;

if (info.includes(plainListItem)) {
  info = info.replace(plainListItem, linkedListItem);
} else if (!info.includes(`href="${next.path}"`)) {
  info = info.replace("          </ul>", `${linkedListItem}\n          </ul>`);
}

info = ensureIncludes(info, `  ${next.key}: {`, (source) =>
  source.replace("  faq: {", `${buildInfoPageEntry(next)}  faq: {`)
);

if (!dryRun) {
  fs.writeFileSync(infoPath, info);
}

let app = fs.readFileSync(appPath, "utf8");
app = ensureIncludes(app, `  "${next.path}": "${next.key}",`, (source) =>
  source.replace('  "/faq": "faq",', `  "${next.path}": "${next.key}",\n  "/faq": "faq",`)
);
app = ensureIncludes(app, `  "${next.key}",`, (source) =>
  source.replace('  "faq",', `  "${next.key}",\n  "faq",`)
);
if (!dryRun) {
  fs.writeFileSync(appPath, app);
}

let prerender = fs.readFileSync(prerenderPath, "utf8");
const prerenderLink = `["${next.path}", "${next.title}"]`;

if (!prerender.includes(prerenderLink)) {
  const linksMatch = prerender.match(/links: \[([\s\S]*?)\],\n      \},/);
  if (!linksMatch) {
    throw new Error("Could not find beginner guide links in prerender script");
  }

  const existingLinks = linksMatch[1].trim();
  const nextLinks = existingLinks
    ? `links: [${existingLinks}, ${prerenderLink}],\n      },`
    : `links: [${prerenderLink}],\n      },`;
  prerender = prerender.replace(linksMatch[0], nextLinks);
}

prerender = ensureIncludes(prerender, `    path: "${next.path}",`, (source) =>
  source.replace('  {\n    path: "/faq",', `${buildPrerenderEntry(next)}  {\n    path: "/faq",`)
);
if (!dryRun) {
  fs.writeFileSync(prerenderPath, prerender);
}

let sitemap = fs.readFileSync(sitemapPath, "utf8");
const sitemapUrl = `<loc>https://www.cpbv-lab.com${next.path}</loc>`;

if (!sitemap.includes(sitemapUrl)) {
  const urlEntry = `  <url>
    <loc>https://www.cpbv-lab.com${next.path}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.75</priority>
  </url>
`;
  sitemap = sitemap.replace("  <url>\n    <loc>https://www.cpbv-lab.com/faq</loc>", `${urlEntry}  <url>\n    <loc>https://www.cpbv-lab.com/faq</loc>`);
}

if (!dryRun) {
  fs.writeFileSync(sitemapPath, sitemap);
}

console.log(`${dryRun ? "Would publish" : "Published"} ${next.path}`);
console.log(`Body chars without spaces: ${charsNoSpace}`);
