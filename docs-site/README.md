# Reading site

The source for the reading website: <https://ofdia-uk.github.io/dvs-data-schema/>.

The site shows the working draft of the data schema to people who would rather not use GitHub. It is for reading only. Feedback, review and history stay on GitHub, and every page links back there.

It uses the same design as the [trust framework reading site](https://ofdia-uk.github.io/dvs-trust-framework/), and its source is adapted from that site's.

## How it works

The site has no copy of the text. [Eleventy](https://www.11ty.dev/) renders the Markdown files in `schema-1.0/` and `supporting-material/`, and `CONTRIBUTING.md`, directly from the repository. Rendering never changes the source files. [`lib/markdown.js`](lib/markdown.js) turns the GitHub-oriented Markdown into web pages:

- It removes each file's caution banner and "Repository navigation" footer. Every page shows a "Draft" status banner instead.
- It uses the first heading as the page title, and keeps the other headings in order without skipping levels. Every heading keeps the ID it has on GitHub and GOV.UK, so a link to a heading works in all three places.
- It points links between Markdown files at the matching site pages, including the links inside data model examples. Links to other repository files go to GitHub.
- It shows data model examples in a fixed-width font with their indentation exactly as written. A long line scrolls sideways inside the example. It is never wrapped.
- It renders the bold first column of the GPG 45 predefined lists table as row headings, as GOV.UK does.
- It applies GOV.UK Frontend styles.

Each page's feedback link carries the name of the page. GitHub puts it in the "Page" field of whichever issue form the reader chooses. GitHub fills in text fields this way, but not dropdowns, so the reader still chooses the guide and section.

The Markdown is never processed by a template engine, so nothing in an example can be interpreted as code.

The list of guides and sections comes from the contents page, `schema-1.0/README.md`. [`lib/contents.js`](lib/contents.js) reads it, so the site keeps no list of its own.

The CSV and YAML files in `supporting-material/` are copied to the site unchanged, so that links to them download the real files. Diagram files are not copied. Links to them go to GitHub, which shows them as diagrams.

## Which repository the links go to

Feedback, history and "view on GitHub" links go to the repository the site was built for. The build reads three settings:

| Setting | Meaning | If not set |
| --- | --- | --- |
| `REPOSITORY_URL` | The repository's address on GitHub | `https://github.com/ofdia-uk/dvs-data-schema` |
| `REPOSITORY_BRANCH` | The branch the site is built from | `main` |
| `PATH_PREFIX` | The folder the site is served from. GitHub Pages serves this site from `/dvs-data-schema/` | `/` |

The workflow sets all three, so a preview published from a fork links to the fork. Links in the Markdown that name the OfDIA repository are pointed at the fork too. This stops feedback given while trying out a preview from being raised in the OfDIA repository by mistake.

## Branding

The site is not part of GOV.UK. Following the GOV.UK Design System rules for services on other domains, it uses [GOV.UK Frontend](https://frontend.design-system.service.gov.uk/) components with:

- the Generic header, showing the OfDIA name instead of the GOV.UK logo;
- no crown, GOV.UK favicons or GDS Transport font (it uses Arial);
- black instead of the GOV.UK brand colour (set in [`src/site.scss`](src/site.scss)).

## Build and publish

The [Reading site workflow](../.github/workflows/site.yml) runs on every pull request and every change to `main`:

- On a pull request it builds the site, tests the rendering and checks every page. The checks cover internal links and anchors, links to downloads, heading order, table headings, image alt text and the draft banner. Nothing is published, and the job has no permission to publish.
- On `main` of the OfDIA repository it does the same and then publishes the site to GitHub Pages.

Publishing needs GitHub Pages enabled for the repository, with **GitHub Actions** as the source (Settings, Pages).

A fork does not publish unless its owner asks it to. To publish a preview from a fork:

1. Enable GitHub Pages in the fork, with **GitHub Actions** as the source.
2. In the fork, add a repository variable called `PUBLISH_PREVIEW` with the value `true` (Settings, Secrets and variables, Actions, Variables).
3. Make the branch to preview the fork's default branch. The site is published from the default branch.

## Run it locally

You need Node.js 24 (see [`.nvmrc`](.nvmrc)) and Python 3.

```sh
cd docs-site
npm ci
npm start          # build the stylesheet, then serve the site at http://localhost:8080/ and rebuild on changes
npm test           # test the Markdown rendering
npm run build      # build once into _site/
python ../tools/check_site.py _site
```

These commands are the same in PowerShell, Command Prompt and a Unix shell. If port 8080 is in use, run `npm start -- --port=8081`.

To build the site as GitHub Pages serves it, set `PATH_PREFIX` first. In PowerShell:

```powershell
$env:PATH_PREFIX = "/dvs-data-schema/"
npm run build
python ../tools/check_site.py _site --path-prefix /dvs-data-schema/
```

In Git Bash on Windows, a value that starts with `/` is turned into a Windows path unless you switch that off:

```sh
MSYS_NO_PATHCONV=1 PATH_PREFIX=/dvs-data-schema/ npm run build
MSYS_NO_PATHCONV=1 python ../tools/check_site.py _site --path-prefix /dvs-data-schema/
```

## Files

| Path | What it is |
| --- | --- |
| `eleventy.config.js` | Which files become pages, their addresses, and site-wide data |
| `lib/markdown.js` | How the Markdown is rendered |
| `lib/contents.js` | Reads the guides and sections from the contents page |
| `_includes/layouts/` | Page templates: `base.njk` for every page, `page.njk` for pages rendered from Markdown |
| `_data/site.js` | Site title, and organisation and publication links |
| `pages/index.njk` | The home page |
| `src/site.scss` | GOV.UK Frontend settings and the site's own styles |
| `assets/init.js` | Starts GOV.UK Frontend's JavaScript, and makes wide tables and examples reachable from the keyboard |
| `test/` | Tests for the Markdown rendering |
