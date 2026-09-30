// Tests for lib/markdown.js and lib/contents.js. Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createMarkdownLibrary, stripRepositoryFurniture, firstHeading, githubSlug, siteUrlFor, rewriteUrl,
  CANONICAL_REPOSITORY_URL,
} from "../lib/markdown.js";
import { readContents, pageName, feedbackUrl } from "../lib/contents.js";

const BANNER =
  "<!-- caution-banner:start (wording is kept in tools/caution-banner.md; edit it there) -->\n" +
  "> [!CAUTION]\n> Working draft.\n<!-- caution-banner:end -->\n\n";
const FOOTER =
  "\n---\n\n**Repository navigation**\n\n[← Previous: 2. Data taxonomy](02-data-taxonomy.md) · [Repository home](../../README.md)\n";
const MODEL = "../schema-1.0/gpg-45/03-data-model.md";

// The tests name the repository themselves. The workflow sets REPOSITORY_URL
// and REPOSITORY_BRANCH for the build, and the tests must not depend on them.
const CANONICAL = { repositoryUrl: CANONICAL_REPOSITORY_URL, branch: "main" };
const canonicalLibrary = createMarkdownLibrary(CANONICAL);

const render = (source, inputPath = MODEL, library = canonicalLibrary) =>
  library.render(stripRepositoryFurniture(source), { page: { inputPath } });

const textOf = (html) => html.replace(/<[^>]+>/g, "");

// An example as it is written in the data model, with a link to another file,
// a link within the file, and a fixed value in quotation marks.
const EXAMPLE = [
  '<pre class="schema-example">',
  "verification:",
  "     trust_framework: 'uk_dvstf'",
  '     evidence: array (<a href="#evidence">evidence</a>)',
  '     assurance_level: <a href="06-predefined-lists.md#predefined-lists">assurance_level</a>',
  '     time: <a href="04-data-dictionary.md#timestamp">timestamp</a>',
  "</pre>",
].join("\n");

test("removes the caution banner, repository navigation and Back section, and nothing else", () => {
  const out = stripRepositoryFurniture(`${BANNER}## Data model\n\nSchema text.\n${FOOTER}`);
  assert.equal(out.includes("caution-banner"), false);
  assert.equal(out.includes("Repository navigation"), false);
  assert.match(out, /Schema text\./);
  assert.equal(stripRepositoryFurniture("# Guide\n\nText.\n\n## Back\n\n- [Contents](../README.md)\n").includes("Back"), false);
});

test("keeps a horizontal rule that is not the repository navigation", () => {
  const out = stripRepositoryFurniture("## Title\n\nBefore.\n\n---\n\nAfter the rule.\n");
  assert.match(out, /After the rule\./);
});

test("uses the first heading as the title and does not repeat it in the body", () => {
  const source = `${BANNER}## GPG 45 Data model\n\nText.\n`;
  assert.equal(firstHeading(source), "GPG 45 Data model");
  assert.equal(render(source).includes("GPG 45 Data model"), false);
});

test("moves headings up so the body starts at h2, and never skips a level", () => {
  const html = render("## GPG 45 data dictionary\n\n### Data definitions\n\n#### Country code\n\nText.\n");
  assert.match(html, /<h2[^>]*>Data definitions<\/h2>/);
  assert.match(html, /<h3[^>]*>Country code<\/h3>/);
});

test("keeps a second heading at the same level as the title as an h2", () => {
  // GPG 44 predefined lists: two headings at the same level, as on GOV.UK.
  const html = render("## Predefined lists\n\n## Table L1: Predefined lists - allowed values\n\nText.\n");
  assert.match(html, /<h2 id="table-l1-predefined-lists---allowed-values"[^>]*>Table L1: Predefined lists - allowed values<\/h2>/);
});

test("gives headings the IDs that GitHub and GOV.UK give them", () => {
  assert.equal(githubSlug("GPG 45 Data model"), "gpg-45-data-model");
  assert.equal(githubSlug("Table D1: Data elements - descriptions"), "table-d1-data-elements---descriptions");
  assert.match(render("## Data model\n\n### Transliteration status\n\nText.\n"), /<h2 id="transliteration-status"/);
});

test("maps repository paths to site addresses", () => {
  assert.equal(siteUrlFor("README.md"), "/");
  assert.equal(siteUrlFor("CONTRIBUTING.md"), "/feedback/");
  assert.equal(siteUrlFor("schema-1.0/README.md"), "/schema-1.0/");
  assert.equal(siteUrlFor("schema-1.0/gpg-44/README.md"), "/schema-1.0/gpg-44/");
  assert.equal(siteUrlFor("schema-1.0/gpg-45/03-data-model.md"), "/schema-1.0/gpg-45/03-data-model/");
  assert.equal(siteUrlFor("supporting-material/machine-readable/gpg-45/dot-path-view.md"), "/supporting-material/machine-readable/gpg-45/dot-path-view/");
  assert.equal(siteUrlFor("supporting-material/machine-readable/gpg-45/predefined-values.csv"), "/supporting-material/machine-readable/gpg-45/predefined-values.csv");
  assert.equal(siteUrlFor("supporting-material/mappings/oid4ida-mapping.yaml"), "/supporting-material/mappings/oid4ida-mapping.yaml");
  assert.equal(siteUrlFor("supporting-material/diagrams/gpg-44-authentication-structure.mmd"), null);
  assert.equal(siteUrlFor("VERSIONS.md"), null);
  assert.equal(siteUrlFor("tools/machine_readable.py"), null);
});

test("rewrites links between Markdown files, keeping anchors", () => {
  const html = render("## T\n\nSee [date](04-data-dictionary.md#date), [contents](../README.md) and [versions](../../VERSIONS.md).\n");
  assert.match(html, /href="\/schema-1\.0\/gpg-45\/04-data-dictionary\/#date"/);
  assert.match(html, /href="\/schema-1\.0\/"/);
  assert.match(html, /href="https:\/\/github\.com\/ofdia-uk\/dvs-data-schema\/blob\/main\/VERSIONS\.md"/);
});

test("sends a link to a repository folder to GitHub's folder view", () => {
  assert.equal(rewriteUrl("../../tools/", "schema-1.0/gpg-45", CANONICAL), `${CANONICAL_REPOSITORY_URL}/tree/main/tools`);
});

test("leaves links to other websites alone", () => {
  const html = render("## T\n\n[GOV.UK](https://www.gov.uk/) and [IANA](https://www.iana.org/assignments/media-types/media-types.xhtml)\n");
  assert.match(html, /href="https:\/\/www\.gov\.uk\/"/);
  assert.match(html, /href="https:\/\/www\.iana\.org\/assignments\/media-types\/media-types\.xhtml"/);
});

test("rewrites the links inside a data model example", () => {
  const html = render(`## T\n\n${EXAMPLE}\n`);
  assert.match(html, /href="#evidence"/);
  assert.match(html, /href="\/schema-1\.0\/gpg-45\/06-predefined-lists\/#predefined-lists"/);
  assert.match(html, /href="\/schema-1\.0\/gpg-45\/04-data-dictionary\/#timestamp"/);
  assert.equal(html.includes(".md"), false);
});

test("keeps every character and space of a data model example", () => {
  const html = render(`## T\n\n${EXAMPLE}\n`);
  const shown = textOf(/<pre[^>]*>([\s\S]*?)<\/pre>/.exec(html)[1]);
  const written = textOf(EXAMPLE.replace(/^<pre[^>]*>/, "").replace(/<\/pre>$/, ""));
  assert.equal(shown, written);
  assert.match(shown, /\n {5}trust_framework: 'uk_dvstf'\n/);
});

test("passes template-like text through unchanged, in text and in examples", () => {
  const html = render('## T\n\nText with {{ braces }} and {% tags %}.\n\n<pre class="schema-example">\nvalue: {{ not_a_template }}\n</pre>\n');
  assert.match(html, /\{\{ braces \}\} and \{% tags %\}/);
  assert.match(html, /value: \{\{ not_a_template \}\}/);
});

test("renders a wholly bold first column as row headers", () => {
  const html = render("## T\n\n| Element | Type | Notes |\n| --- | --- | --- |\n| **assurance_level** | string | Levels |\n| **encoding_format** | string | |\n");
  assert.match(html, /<th scope="col" class="govuk-table__header">Element<\/th>/);
  assert.match(html, /<th scope="row" class="govuk-table__header">assurance_<wbr>level<\/th>/);
  assert.match(html, /<td class="govuk-table__cell">string<\/td>/);
  assert.equal(html.includes("<strong>"), false);
});

test("leaves bold cells alone unless every row starts with one", () => {
  const html = render("## T\n\n| A | B |\n| --- | --- |\n| **Bold** | text |\n| plain | text |\n");
  assert.equal(html.includes('scope="row"'), false);
  assert.match(html, /<strong>Bold<\/strong>/);
});

test("lets long names break after an underscore in tables, without changing the text", () => {
  const html = render("## T\n\n| Predefined value | Definition |\n| --- | --- |\n| civil_partnership_certificate | A document |\n");
  assert.match(html, /civil_<wbr>partnership_<wbr>certificate/);
  assert.match(textOf(html), /civil_partnership_certificate/);
});

test("does not add break points outside tables", () => {
  const html = render(`## T\n\nThe check_id links checks.\n\n${EXAMPLE}\n`);
  assert.equal(html.includes("<wbr>"), false);
});

test("lets a table with 4 or more columns use the full width", () => {
  const four = render("## T\n\n| A | B | C | D |\n| --- | --- | --- | --- |\n| 1 | 2 | 3 | 4 |\n");
  const two = render("## T\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n");
  assert.match(four, /class="app-table-wrapper app-scroll app-table-wrapper--wide"/);
  assert.match(two, /class="app-table-wrapper app-scroll"/);
});

test("styles a table written in HTML and keeps its colours", () => {
  const source =
    "## T\n\n<table>\n  <thead>\n    <tr><th>Field</th><th>Type</th><th>Kind of type</th><th>Description</th></tr>\n  </thead>\n  <tbody>\n" +
    '    <tr>\n      <td><code>multifactor</code></td>\n      <td style="background-color:#fff9e6"><code>string</code></td>\n' +
    '      <td>Primitive</td>\n      <td>See the <a href="../../schema-1.0/gpg-44/03-data-model.md">data model</a>.</td>\n    </tr>\n  </tbody>\n</table>\n';
  const html = render(source, "../supporting-material/presentation-experiments/gpg-44-colour-coded-model.md");
  assert.match(html, /<div class="app-table-wrapper app-scroll app-table-wrapper--wide">\n<table class="govuk-table">/);
  assert.match(html, /<th scope="col" class="govuk-table__header">Kind of type<\/th>/);
  assert.match(html, /<td class="govuk-table__cell" style="background-color:#fff9e6">/);
  assert.match(html, /<td class="govuk-table__cell">Primitive<\/td>/);
  assert.match(html, /href="\/schema-1\.0\/gpg-44\/03-data-model\/"/);
});

test("a preview built from a fork links to the fork, not the main repository", () => {
  const fork = createMarkdownLibrary({ repositoryUrl: "https://github.com/someone/dvs-data-schema", branch: "preview/full-demo" });
  const html = render(
    "## T\n\n[Open a new issue](https://github.com/ofdia-uk/dvs-data-schema/issues/new/choose), [versions](../../VERSIONS.md) " +
    "and [the published version](https://www.gov.uk/government/publications/uk-digital-verification-services-trust-framework-data-schema-1-0).\n",
    MODEL, fork);
  assert.match(html, /href="https:\/\/github\.com\/someone\/dvs-data-schema\/issues\/new\/choose"/);
  assert.match(html, /href="https:\/\/github\.com\/someone\/dvs-data-schema\/blob\/preview\/full-demo\/VERSIONS\.md"/);
  assert.equal(html.includes("github.com/ofdia-uk"), false);
  assert.match(html, /href="https:\/\/www\.gov\.uk\/government\/publications\//);
});

const CONTENTS =
  "# Contents\n\n## GPG 45: identity checking\n\nAbout.\n\n- [1. Introduction](gpg-45/01-introduction.md)\n- [2. Data taxonomy](gpg-45/02-data-taxonomy.md)\n\n" +
  "## GPG 44: authentication\n\n- [1. Introduction](gpg-44/01-introduction.md)\n- [2. Data taxonomy](gpg-44/02-data-taxonomy.md)\n\n" +
  "## Give feedback\n\n- [1. Not a section](../CONTRIBUTING.md)\n";

test("reads the guides and their sections from the contents page", () => {
  const guides = readContents(CONTENTS);
  assert.deepEqual(guides.map((g) => [g.title, g.folder]), [["GPG 45: identity checking", "gpg-45"], ["GPG 44: authentication", "gpg-44"]]);
  assert.deepEqual(guides[1].sections, [
    { label: "1. Introduction", path: "gpg-44/01-introduction.md" },
    { label: "2. Data taxonomy", path: "gpg-44/02-data-taxonomy.md" },
  ]);
});

test("refuses a contents page with no guides, instead of building an empty site", () => {
  assert.throws(() => readContents("# Contents\n\nNo guides here.\n"));
});

test("names a page for the Page field of an issue form", () => {
  const guide = { title: "GPG 45: identity checking" };
  assert.equal(pageName({ guide, section: { label: "3. Data model" } }, "schema-1.0/gpg-45/03-data-model.md", "GPG 45 Data model"),
    "GPG 45: identity checking – 3. Data model");
  assert.equal(pageName({ guide, section: null }, "schema-1.0/gpg-45/README.md", "GPG 45: identity checking"), "GPG 45: identity checking");
  assert.equal(pageName(null, "supporting-material/diagrams/README.md", "Diagrams"), "Supporting material – Diagrams");
  assert.equal(pageName(null, "supporting-material/README.md", "Supporting material"), "Supporting material");
});

test("builds a feedback link that GitHub can read the page name from", () => {
  const url = new URL(feedbackUrl("https://github.com/someone/dvs-data-schema", "GPG 45: identity checking – 3. Data model"));
  assert.equal(url.origin + url.pathname, "https://github.com/someone/dvs-data-schema/issues/new/choose");
  assert.equal(url.searchParams.get("page"), "GPG 45: identity checking – 3. Data model");
  assert.equal(url.search.includes(" "), false);
});

// The real section files: whatever they contain, the site must show the same
// examples and the same table cells.
const REPO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sectionFiles = ["gpg-45", "gpg-44"].flatMap((guide) =>
  fs.readdirSync(path.join(REPO_DIR, "schema-1.0", guide))
    .filter((name) => /^\d\d-.*\.md$/.test(name))
    .map((name) => `schema-1.0/${guide}/${name}`));

const decode = (text) => text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

test("shows every example in the section files exactly as written", () => {
  let examples = 0;
  for (const file of sectionFiles) {
    const source = fs.readFileSync(path.join(REPO_DIR, file), "utf-8").replace(/\r\n/g, "\n");
    const html = render(source, `../${file}`);
    const written = [...source.matchAll(/<pre class="schema-example">\n([\s\S]*?)<\/pre>/g)].map((m) => textOf(m[1]));
    const shown = [...html.matchAll(/<pre class="schema-example[^"]*">\n([\s\S]*?)<\/pre>/g)].map((m) => textOf(m[1]));
    assert.deepEqual(shown, written, file);
    examples += shown.length;
  }
  assert.equal(examples > 0, true, "no examples were found in the section files");
});

test("shows every table cell in the section files exactly as written", () => {
  let cells = 0;
  for (const file of sectionFiles) {
    const source = fs.readFileSync(path.join(REPO_DIR, file), "utf-8").replace(/\r\n/g, "\n");
    const html = render(source, `../${file}`);
    const written = source.split("\n")
      .filter((line) => line.startsWith("|") && !/^\|( --- \|)+$/.test(line))
      .flatMap((line) => line.slice(1, -1).split("|").map((cell) => cell.trim().replace(/^\*\*(.+)\*\*$/, "$1")));
    const shown = [...html.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((m) => decode(textOf(m[1])).trim());
    assert.deepEqual(shown, written, file);
    cells += shown.length;
  }
  assert.equal(cells > 0, true, "no tables were found in the section files");
});
