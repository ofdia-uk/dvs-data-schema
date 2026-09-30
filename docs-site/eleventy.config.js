// Eleventy configuration for the reading site.
//
// The site renders the Markdown files in the repository as they are. It does
// not keep its own copy of the text. The input directory is the repository
// root. The data schema, the supporting material and the feedback guidance
// become pages.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nunjucks from "nunjucks";
import { EleventyHtmlBasePlugin } from "@11ty/eleventy";
import {
  markdownLibrary, stripRepositoryFurniture, firstHeading, githubSlug, siteUrlFor,
  REPOSITORY_URL, REPOSITORY_BRANCH,
} from "./lib/markdown.js";
import { readContents, pageName, feedbackUrl } from "./lib/contents.js";

const SITE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = path.dirname(SITE_DIR);
const GOVUK_FRONTEND = path.join(SITE_DIR, "node_modules", "govuk-frontend", "dist");
const CONTENTS = "schema-1.0/README.md";

/** Repository-relative path of a page's source file, for example "schema-1.0/README.md". */
const repoPathOf = (inputPath) => inputPath.replace(/\\/g, "/").replace(/^(\.\.\/|\.\/)+/, "");

const titleOf = (repoPath) => firstHeading(fs.readFileSync(path.join(REPO_DIR, repoPath), "utf-8"));

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);

  eleventyConfig.setLibrary("md", markdownLibrary);
  eleventyConfig.setLibrary(
    "njk",
    new nunjucks.Environment(
      new nunjucks.FileSystemLoader([path.join(SITE_DIR, "_includes"), GOVUK_FRONTEND]),
      { autoescape: true, throwOnUndefined: false },
    ),
  );

  // The Markdown is written for GitHub; remove the banner and repository
  // navigation, which the site layout replaces.
  eleventyConfig.addPreprocessor("repository-furniture", "md", (data, content) => stripRepositoryFurniture(content));

  // Repository files that are not pages. (A Markdown file outside the data
  // schema and supporting material is also left out, because it has no site
  // address: see siteUrlFor.)
  for (const pattern of [
    "../README.md", "../ARCHITECTURE.md", "../VERSIONS.md", "../SECURITY.md", "../LICENCE.md",
    "../media/**", "../tools/**", "../.github/**",
    "../docs-site/README.md", "../docs-site/node_modules/**", "../docs-site/_site/**",
  ]) {
    eleventyConfig.ignores.add(pattern);
  }

  // The data files that readers can download are served as they are.
  eleventyConfig.addPassthroughCopy({
    "../supporting-material/machine-readable/gpg-45/*.{csv,yaml}": "supporting-material/machine-readable/gpg-45",
    "../supporting-material/machine-readable/gpg-44/*.{csv,yaml}": "supporting-material/machine-readable/gpg-44",
    "../supporting-material/mappings/*.yaml": "supporting-material/mappings",
    "assets/init.js": "assets/init.js",
    [path.join("node_modules", "govuk-frontend", "dist", "govuk", "govuk-frontend.min.js")]: "assets/govuk-frontend.min.js",
  });

  // The guides and their sections, read from the contents page so that the
  // site never keeps its own list of them.
  const guides = readContents(fs.readFileSync(path.join(REPO_DIR, CONTENTS), "utf-8")).map((guide) => ({
    ...guide,
    repoPath: `schema-1.0/${guide.folder}/README.md`,
    url: siteUrlFor(`schema-1.0/${guide.folder}/README.md`),
    sections: guide.sections.map((section) => ({
      ...section,
      repoPath: `schema-1.0/${section.path}`,
      url: siteUrlFor(`schema-1.0/${section.path}`),
    })),
  }));
  eleventyConfig.addGlobalData("guides", guides);

  const locate = (repoPath) => {
    for (const guide of guides) {
      const index = guide.sections.findIndex((section) => section.repoPath === repoPath);
      if (index !== -1) return { guide, index, section: guide.sections[index] };
      if (guide.repoPath === repoPath) return { guide, index: -1, section: null };
    }
    return null;
  };

  eleventyConfig.addGlobalData("eleventyComputed", {
    repoPath: (data) => repoPathOf(data.page.inputPath),
    permalink: (data) => {
      if (data.permalink) return data.permalink;
      return siteUrlFor(repoPathOf(data.page.inputPath)) ?? false;
    },
    title: (data) => {
      if (data.title) return data.title;
      if (!data.page.inputPath.endsWith(".md")) return "";
      return titleOf(repoPathOf(data.page.inputPath));
    },
    // The first heading is shown as the page title. It keeps the ID it has
    // on GitHub and GOV.UK, so links to that heading still work.
    titleId: (data) => {
      if (!data.page.inputPath.endsWith(".md")) return "";
      return githubSlug(titleOf(repoPathOf(data.page.inputPath)));
    },
  });
  // Default layout for pages rendered from Markdown. (Eleventy resolves layouts
  // before computed data, so this has to be ordinary global data.)
  eleventyConfig.addGlobalData("layout", "layouts/page.njk");

  // Headings for an "On this page" list: <h2 id="...">text</h2> in rendered content.
  eleventyConfig.addFilter("pageHeadings", (html) =>
    [...String(html).matchAll(/<h2[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g)].map(([, id, text]) => ({
      id,
      text: text.replace(/<[^>]+>/g, "").trim(),
    })),
  );

  // Where a page sits in its guide: the guide, and the sections before and after.
  eleventyConfig.addFilter("inGuide", (repoPath) => {
    const found = locate(repoPath ?? "");
    if (!found) return null;
    const { guide, index, section } = found;
    return {
      guide,
      section,
      previous: index > 0 ? guide.sections[index - 1] : null,
      next: index >= 0 && index + 1 < guide.sections.length ? guide.sections[index + 1] : null,
    };
  });

  // The pages above this one, for breadcrumbs: each folder's README, from the top.
  eleventyConfig.addFilter("pagesAbove", (repoPath) => {
    const parts = (repoPath ?? "").split("/");
    const crumbs = [];
    for (let depth = 1; depth < parts.length; depth++) {
      const readme = [...parts.slice(0, depth), "README.md"].join("/");
      if (readme === repoPath || siteUrlFor(readme) === null) continue;
      if (!fs.existsSync(path.join(REPO_DIR, readme))) continue;
      crumbs.push({ text: readme === CONTENTS ? "Contents" : titleOf(readme), href: siteUrlFor(readme) });
    }
    return crumbs;
  });

  // A link to give feedback about a page. It carries the page's name, which
  // GitHub puts in the "Page" field of whichever issue form the reader chooses.
  eleventyConfig.addFilter("feedbackUrl", (repoPath, title) =>
    feedbackUrl(REPOSITORY_URL, pageName(locate(repoPath ?? ""), repoPath ?? "", title)));

  eleventyConfig.addGlobalData("repositoryUrl", REPOSITORY_URL);
  eleventyConfig.addGlobalData("repositoryBranch", REPOSITORY_BRANCH);
}

export const config = {
  dir: {
    input: "..",
    includes: "docs-site/_includes",
    data: "docs-site/_data",
    output: "_site",
  },
  templateFormats: ["md", "njk"],
  // The Markdown is schema text: never run it through a template engine.
  markdownTemplateEngine: false,
  htmlTemplateEngine: "njk",
  pathPrefix: process.env.PATH_PREFIX || "/",
};
