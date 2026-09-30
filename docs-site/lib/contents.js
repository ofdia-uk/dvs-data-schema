// Reads the guides and their sections from the contents page,
// schema-1.0/README.md, so that the site keeps no list of its own.
//
// A guide is a heading such as "## GPG 45: identity checking". Its sections
// are the numbered links below it, such as
// "- [3. Data model](gpg-45/03-data-model.md)". tools/check_links.py reads the
// page the same way to check the issue forms.

const GUIDE = /^## (GPG \d+: .+?)\s*$/;
const SECTION = /^- \[(\d+\. [^\]]+)\]\(([^)#]+\.md)\)/;

/** The guides on the contents page: [{ title, folder, sections: [{ label, path }] }]. */
export function readContents(markdown) {
  const guides = [];
  let current = null;
  for (const line of markdown.split(/\r?\n/)) {
    const guide = GUIDE.exec(line);
    const section = SECTION.exec(line);
    if (guide) {
      current = { title: guide[1], folder: "", sections: [] };
      guides.push(current);
    } else if (line.startsWith("## ")) {
      current = null; // any other heading ends the guide's list
    } else if (section && current) {
      current.sections.push({ label: section[1], path: section[2] });
      current.folder ||= section[2].split("/")[0];
    }
  }
  if (!guides.length || guides.some((guide) => !guide.sections.length)) {
    throw new Error("The contents page must list each guide as '## GPG NN: name' followed by its numbered sections.");
  }
  return guides;
}

/**
 * How a page is named in the "Page" field of an issue form, for example
 * "GPG 45: identity checking – 3. Data model".
 */
export function pageName(found, repoPath, title) {
  if (found) {
    return found.section ? `${found.guide.title} – ${found.section.label}` : found.guide.title;
  }
  if (repoPath.startsWith("supporting-material/") && title !== "Supporting material") {
    return `Supporting material – ${title}`;
  }
  return title;
}

/**
 * A link to the page where a reader chooses the kind of feedback to give.
 * GitHub passes "page" on to whichever issue form they choose, and fills in
 * that form's "Page" field with it.
 */
export function feedbackUrl(repositoryUrl, page) {
  return `${repositoryUrl}/issues/new/choose?${new URLSearchParams({ page })}`;
}
