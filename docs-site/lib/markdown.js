// Markdown rendering for the reading site.
//
// The Markdown files are written for GitHub. This module renders the same
// files as web pages without changing them:
//
// - removes the repository caution banner and the "Repository navigation"
//   footer, which the site layout replaces with its own status banner and
//   page navigation;
// - uses the page's first heading as its title, and moves the remaining
//   headings up so each page has one <h1> and no skipped levels;
// - rewrites links between repository files to the site's addresses,
//   including the links inside data model examples;
// - applies GOV.UK Frontend classes to the rendered HTML;
// - renders a wholly bold first column as table row headers, as the GOV.UK
//   publication does for the GPG 45 predefined lists.
//
// The Markdown is only ever parsed as Markdown. It is never passed through a
// template engine, so nothing in an example can be run as code.

import path from "node:path";
import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";

// The repository the Markdown files name in their links.
export const CANONICAL_REPOSITORY_URL = "https://github.com/ofdia-uk/dvs-data-schema";

// The repository and branch this build is for. A preview built from a fork
// sets these, so that its feedback, history and source links go to the fork.
export const REPOSITORY_URL = (process.env.REPOSITORY_URL || CANONICAL_REPOSITORY_URL).replace(/\/+$/, "");
export const REPOSITORY_BRANCH = process.env.REPOSITORY_BRANCH || "main";

const BANNER = /^<!-- caution-banner:start[^\n]*-->\r?\n[\s\S]*?^<!-- caution-banner:end -->\r?\n/m;
const REPO_FOOTER = /\r?\n(?:---|\*\*\*|___)\s*\r?\n+\*\*Repository navigation\*\*[\s\S]*$/;
const BACK_SECTION = /\r?\n## Back\s*\r?\n[\s\S]*$/;
const FIRST_HEADING = /^#{1,6}\s+(.+?)\s*#*\s*$/m;

// Folders whose Markdown files become pages, and the files in them that
// readers can download.
const PAGE_FOLDERS = ["schema-1.0/", "supporting-material/"];
const DOWNLOADS = /^supporting-material\/.+\.(csv|yaml)$/;

/** Prepare a Markdown file for rendering: remove repository-only material. */
export function stripRepositoryFurniture(source) {
  return source.replace(BANNER, "").replace(REPO_FOOTER, "\n").replace(BACK_SECTION, "\n");
}

/** The text of the first heading in a Markdown file, used as the page title. */
export function firstHeading(source) {
  const match = stripRepositoryFurniture(source).match(FIRST_HEADING);
  return match ? match[1].replace(/<[^>]+>/g, "").replace(/`/g, "").trim() : "";
}

/** The ID GitHub gives a heading. Links to a heading use it, on GitHub and on GOV.UK. */
export function githubSlug(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{N}_\- ]/gu, "")
    .replace(/ /g, "-");
}

/** The site address for a repository path, or null if it is not on the site. */
export function siteUrlFor(repoPath) {
  if (repoPath === "README.md") return "/";
  if (repoPath === "CONTRIBUTING.md") return "/feedback/";
  if (DOWNLOADS.test(repoPath)) return `/${repoPath}`;
  if (repoPath.endsWith(".md") && PAGE_FOLDERS.some((folder) => repoPath.startsWith(folder))) {
    return `/${repoPath.replace(/README\.md$/, "").replace(/\.md$/, "/")}`;
  }
  return null;
}

/** Where a link in a Markdown file should go on the site. */
export function rewriteUrl(url, sourceDir, { repositoryUrl = REPOSITORY_URL, branch = REPOSITORY_BRANCH } = {}) {
  if (!url || url.startsWith("#") || url.startsWith("/")) return url;
  if (url === CANONICAL_REPOSITORY_URL || url.startsWith(`${CANONICAL_REPOSITORY_URL}/`)) {
    return repositoryUrl + url.slice(CANONICAL_REPOSITORY_URL.length);
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url; // another website, or mailto:
  const [target, fragment] = url.split("#");
  const repoPath = path.posix.normalize(path.posix.join(sourceDir, decodeURI(target)));
  const siteUrl = siteUrlFor(repoPath);
  // Repository files that are not on the site are shown on GitHub. A path
  // with no file extension is a folder.
  const view = path.posix.extname(repoPath) ? "blob" : "tree";
  const base = siteUrl ?? `${repositoryUrl}/${view}/${branch}/${repoPath.replace(/\/$/, "")}`;
  return fragment ? `${base}#${fragment}` : base;
}

// Tables scroll sideways inside a wrapper instead of widening the page. A
// table with 4 or more columns may also use the full width of the page.
const wrapperClass = (columns) => `app-table-wrapper app-scroll${columns >= 4 ? " app-table-wrapper--wide" : ""}`;

// HTML written directly in the Markdown: data model examples, and the tables
// in the presentation experiments. Point its links at the site and give it
// the same classes as the rest of the page. Its text is not changed.
function enhanceHtml(html, rewrite) {
  return html
    .replace(/<a\s+href="([^"]*)"\s*>/g, (_, href) => `<a class="govuk-link" href="${rewrite(href)}">`)
    .replace(/<pre class="schema-example">/g, '<pre class="schema-example app-scroll">')
    .replace(/<table>([\s\S]*?)<\/table>/g, (_, body) => {
      const columns = (/<tr>([\s\S]*?)<\/tr>/.exec(body)?.[1].match(/<th>/g) ?? []).length;
      return `<div class="${wrapperClass(columns)}">\n<table class="govuk-table">${body}</table>\n</div>`;
    })
    .replace(/<thead>/g, '<thead class="govuk-table__head">')
    .replace(/<tbody>/g, '<tbody class="govuk-table__body">')
    .replace(/<tr>/g, '<tr class="govuk-table__row">')
    .replace(/<th>/g, '<th scope="col" class="govuk-table__header">')
    .replace(/<td(\s[^>]*)?>/g, (_, attrs) => `<td class="govuk-table__cell"${attrs ?? ""}>`)
    .replace(/<code>/g, '<code class="app-code">');
}

// Resolve relative links against the source file and map them to site pages.
function rewriteLinks(md, options) {
  const sourceDirOf = (env) => {
    const inputPath = env?.page?.inputPath;
    if (!inputPath) return null;
    return path.posix.dirname(inputPath.replace(/\\/g, "/").replace(/^(\.\.\/|\.\/)+/, ""));
  };
  md.core.ruler.push("site_links", (state) => {
    const sourceDir = sourceDirOf(state.env);
    if (sourceDir === null) return;
    const rewrite = (url) => rewriteUrl(url, sourceDir, options);
    const visit = (tokens) => {
      for (const token of tokens) {
        if (token.type === "link_open") token.attrSet("href", rewrite(token.attrGet("href")));
        if (token.type === "image") token.attrSet("src", rewrite(token.attrGet("src")));
        if (token.type === "html_block" || token.type === "html_inline") token.content = enhanceHtml(token.content, rewrite);
        if (token.children) visit(token.children);
      }
    };
    visit(state.tokens);
  });
}

// The first heading becomes the page title (rendered by the layout), so it
// is removed here and the rest are moved up to start at <h2>.
function titleAndHeadingLevels(md) {
  md.core.ruler.push("site_headings", (state) => {
    const tokens = state.tokens;
    const first = tokens.findIndex((t) => t.type === "heading_open");
    if (first === -1) return;
    tokens.splice(first, 3);
    const levels = tokens.filter((t) => t.type === "heading_open").map((t) => Number(t.tag.slice(1)));
    if (!levels.length) return;
    const shift = Math.min(...levels) - 2;
    // Never let a heading skip a level. Only the level changes.
    let previous = 1;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== "heading_open") continue;
      const level = Math.min(6, Math.max(2, Number(tokens[i].tag.slice(1)) - shift), previous + 1);
      tokens[i].tag = `h${level}`;
      const close = tokens.findIndex((t, j) => j > i && t.type === "heading_close");
      tokens[close].tag = `h${level}`;
      previous = level;
    }
  });
}

// Row headings are written as bold cells in the first column (the GPG 45
// predefined lists). When every row of a table starts with a wholly bold
// cell, render those cells as <th scope="row">, as GOV.UK does.
function boldRowHeaders(md) {
  const wholeBold = (inline) => {
    const children = (inline?.children ?? []).filter((c) => !(c.type === "text" && c.content.trim() === ""));
    const bold =
      children.length >= 3 &&
      children[0].type === "strong_open" &&
      children.at(-1).type === "strong_close" &&
      children.slice(1, -1).every((c) => c.type !== "strong_open" && c.type !== "strong_close");
    return bold ? children.slice(1, -1) : null;
  };
  md.core.ruler.push("bold_row_headers", (state) => {
    const tokens = state.tokens;
    for (let start = 0; start < tokens.length; start++) {
      if (tokens[start].type !== "tbody_open") continue;
      const end = tokens.findIndex((t, j) => j > start && t.type === "tbody_close");
      // The first cell of each body row: the token after each <tr>.
      const firstCells = [];
      for (let i = start; i < end; i++) {
        if (tokens[i].type === "tr_open") firstCells.push(i + 1);
      }
      if (!firstCells.length || !firstCells.every((i) => wholeBold(tokens[i + 1]))) continue;
      for (const i of firstCells) {
        tokens[i + 1].children = wholeBold(tokens[i + 1]);
        tokens[i].tag = "th";
        tokens[i].attrSet("scope", "row");
        tokens[i].meta = { ...(tokens[i].meta || {}), rowHeader: true };
        tokens[i + 2].tag = "th";
      }
    }
  });
}

// Names such as civil_partnership_certificate are long and have no spaces, so
// on a small screen one name can fill the width of a table. Let the browser
// break a name after an underscore, in tables only. <wbr> is not a character:
// the text a reader sees, selects or copies is unchanged.
function breakLongNamesInTables(md) {
  md.core.ruler.push("table_word_breaks", (state) => {
    let inTable = false;
    for (const token of state.tokens) {
      if (token.type === "table_open") inTable = true;
      if (token.type === "table_close") inTable = false;
      if (!inTable || token.type !== "inline" || !token.children) continue;
      token.children = token.children.flatMap((child) => {
        if (child.type !== "text" || !child.content.includes("_")) return [child];
        return child.content.split(/(?<=_)(?=[^\s_])/).flatMap((part, n) => {
          const text = new state.Token("text", "", 0);
          text.content = part;
          if (n === 0) return [text];
          const wbr = new state.Token("html_inline", "", 0);
          wbr.content = "<wbr>";
          return [wbr, text];
        });
      });
    }
  });
}

function govukClasses(md) {
  const addClass = (name, classes) => {
    const previous = md.renderer.rules[name] ?? ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
    md.renderer.rules[name] = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const value = typeof classes === "function" ? classes(token) : classes;
      if (value) token.attrJoin("class", value);
      return previous(tokens, idx, options, env, self);
    };
  };
  const headingClass = { h2: "govuk-heading-l", h3: "govuk-heading-m", h4: "govuk-heading-s", h5: "govuk-heading-s", h6: "govuk-heading-s" };
  addClass("heading_open", (t) => headingClass[t.tag]);
  addClass("paragraph_open", (t) => (t.hidden ? "" : "govuk-body"));
  addClass("bullet_list_open", "govuk-list govuk-list--bullet");
  addClass("ordered_list_open", "govuk-list govuk-list--number");
  addClass("blockquote_open", "govuk-inset-text");
  addClass("link_open", "govuk-link");
  addClass("hr", "govuk-section-break govuk-section-break--l govuk-section-break--visible");
  addClass("table_open", "govuk-table");
  addClass("thead_open", "govuk-table__head");
  addClass("tbody_open", "govuk-table__body");
  addClass("tr_open", "govuk-table__row");
  addClass("th_open", (t) => {
    t.attrSet("scope", "col");
    return "govuk-table__header";
  });
  addClass("td_open", (t) => (t.meta?.rowHeader ? "govuk-table__header" : "govuk-table__cell"));
  const tableOpen = md.renderer.rules.table_open;
  md.renderer.rules.table_open = (tokens, idx, ...rest) => {
    const firstRowEnd = tokens.findIndex((t, j) => j > idx && t.type === "tr_close");
    const columns = tokens.slice(idx, firstRowEnd).filter((t) => t.type === "th_open").length;
    return `<div class="${wrapperClass(columns)}">\n${tableOpen(tokens, idx, ...rest)}`;
  };
  md.renderer.rules.table_close = () => "</table>\n</div>\n";
  addClass("code_inline", "app-code");
  // Code blocks, such as the path and tree views, scroll sideways too.
  const fence = md.renderer.rules.fence;
  md.renderer.rules.fence = (...args) => fence(...args).replace(/^<pre>/, '<pre class="app-code-block app-scroll">');
}

/** A Markdown renderer for the site. The options say which repository non-site links go to. */
export function createMarkdownLibrary(options = {}) {
  return markdownIt({ html: true, linkify: false, typographer: false })
    .use(titleAndHeadingLevels)
    .use(markdownItAnchor, { slugify: githubSlug, tabIndex: false })
    .use(rewriteLinks, options)
    .use(boldRowHeaders)
    .use(breakLongNamesInTables)
    .use(govukClasses);
}

export const markdownLibrary = createMarkdownLibrary();
