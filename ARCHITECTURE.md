<!-- caution-banner:start (wording is kept in tools/caution-banner.md; edit it there) -->
> [!CAUTION]
> This is a working draft of the UK digital verification services trust framework data schema, maintained for collaboration and review. It is not the formally published version and may differ from it. For the published data schema, see [GOV.UK](https://www.gov.uk/government/publications/uk-digital-verification-services-trust-framework-data-schema-1-0).
<!-- caution-banner:end -->

# How this repository works

A reference for OfDIA maintainers: how the repository is organised, what each part is for, and how to carry out routine tasks.

## GitHub, GOV.UK and who decides

| Stage | What it means |
| --- | --- |
| Issue | Feedback, a question or a proposal. Raising an issue does not mean OfDIA has accepted it. |
| Pull request | A proposed change, reviewed and discussed before a decision is made. |
| Merged into `main` | Accepted into the working draft. Not yet published. |
| `published-X.Y` tag | The text exactly as formally published. See [Versions](VERSIONS.md). |
| GOV.UK publication | The authoritative, formally published version. |

Automated checks support this process. They do not approve changes to the data schema. Decisions about the data schema are made by the OfDIA policy owner through review.

## Schema text and repository material

The repository holds two kinds of material, and they are changed differently.

- **Schema text** is the text in the section files under `schema-1.0/gpg-45/` and `schema-1.0/gpg-44/`. It changes only through a reviewed pull request that records the authority for the change, such as a linked issue or an OfDIA decision. Keep changes to the schema text in their own pull requests, separate from repository changes.
- **Repository material** is everything added to help people read, discuss and maintain the text: the caution banner, navigation footers, README files, supporting material, templates, tools and workflows. It can be improved without a policy decision, as long as the schema text is unchanged.

A change to the schema text is a change to what the data schema says if it alters any of these: an element or value name, a definition, a type, a list of values, the order or nesting of elements, or an example. Names and values are case-sensitive, and punctuation in them matters. If you cannot tell whether a change alters what the data schema says, treat it as if it does.

## Layout

| Path | What it holds |
| --- | --- |
| `schema-1.0/` | The working draft: one folder per guide (`gpg-45/` and `gpg-44/`), one file per section |
| `supporting-material/` | Diagrams, data files, mappings and presentation experiments made from the data schema. Not part of the published text |
| `media/` | The OfDIA banner image |
| `tools/` | The caution banner source, and the tools used by the checks, with their tests |
| `.github/` | Issue forms, pull request template, code owners and workflows |
| `docs-site/` | Source for the [reading site](https://ofdia-uk.github.io/dvs-data-schema/), built from the Markdown and published from `main` |

## How the text is structured

GOV.UK publishes each guide as one page. Here each guide is 6 files, one per section, so that a change and its review can focus on one section.

- The headings are the published headings. They have no section numbers. The numbers in the file names and in contents lists are repository material.
- The first heading in each file is a level 2 heading. On GOV.UK, "Predefined values" and "Predefined lists" sit one level lower, under the data dictionary.
- Data model examples are `<pre class="schema-example">` blocks, so that their indentation is kept exactly. Links inside them are HTML links.
- Tables are Markdown tables. In the GPG 45 predefined lists table, the first cell of each row is bold. On GOV.UK those cells are row headings.
- A link to another section is a relative link to that file and heading, such as `04-data-dictionary.md#date`. GitHub gives each heading the same ID that GOV.UK does, so published links to a heading still work.
- GOV.UK shows typographic quotation marks (‘ ’). The files here use straight ones (').
- The navigation links at the end of each section file, below a horizontal rule, are repository material.
- The text was converted from the GOV.UK publication when it was first added. The scripts used then were removed afterwards. They remain in the repository history at commit `27b05e8`, under `supporting-material/scripts/`.

## Compare the text with GOV.UK

[`tools/compare_with_govuk.py`](tools/compare_with_govuk.py) reads both guides from GOV.UK and compares them with the section files. It compares every heading, paragraph, list item, example line and its indentation, table cell and link, and reports each difference. It ignores only the differences in presentation listed at the top of the tool.

```sh
python tools/compare_with_govuk.py
```

Run it:

- before a commit is tagged `published-X.Y`, to confirm that the text matches the publication
- after GOV.UK publishes a correction, to see exactly what changed

Once the working draft includes accepted changes that are not yet published, the tool is expected to report them. The **External checks** workflow therefore compares GOV.UK with the latest `published-X.Y` tag, not with `main`. If GOV.UK changes, that check fails and shows what changed.

## Caution banner

Each applicable Markdown file starts with a banner saying that the repository is a working draft and that GOV.UK holds the published version. The banner must stay visible to anyone who opens a single file on GitHub.

The wording is kept in one place, [`tools/caution-banner.md`](tools/caution-banner.md). In each file it sits between two HTML comments that GitHub does not display:

```markdown
<!-- caution-banner:start (wording is kept in tools/caution-banner.md; edit it there) -->
> [!CAUTION]
> This is a working draft of ...
<!-- caution-banner:end -->
```

To change the wording:

1. On a new branch, edit `tools/caution-banner.md`.
2. Apply it in one of two ways:
   - in a local copy, run `python tools/caution_banner.py --apply`, or
   - in the browser, go to **Actions**, choose **Apply caution banner**, and run it on your branch.
3. Open a pull request and review the changes. Every file's banner changes, and nothing else should.

The tool changes only the lines between the markers. It also adds the banner to a file that clearly has none. For anything unexpected it changes nothing and reports the file. That includes a banner without markers, text directly under the banner, duplicate or damaged markers, a byte order mark or front matter. Fix those files by hand. This is deliberate: the tool never guesses where the banner ends and the schema text begins.

Files under `.github/`, `tools/` and `docs-site/` do not need the banner.

## Data files

The CSV and YAML files in [`supporting-material/machine-readable/`](supporting-material/machine-readable/README.md) repeat parts of the data schema, so they can go out of date when it changes.

[`tools/machine_readable.py`](tools/machine_readable.py) keeps them in step:

- it writes `predefined-values.csv` and `predefined-lists.csv` for each guide from the tables in the section files, cell for cell
- it writes `data-dictionary.yaml` from `data-dictionary.csv`
- it checks that `data-dictionary.csv`, which is written by hand, lists the same elements and types as the examples in the data model

After changing the schema text, run `python tools/machine_readable.py --write` and commit the result. The diagrams, the path and tree views, the mappings and the presentation experiments are written by hand, and no tool checks them.

## Automated checks

The **Repository checks** workflow runs on every pull request and every change to `main`. It uses read-only permissions and needs no secrets, so it also runs on pull requests from forks. It has no path filters, so if a check is made required it never waits in a "Pending" state.

| Check | Confirms | Does not confirm |
| --- | --- | --- |
| Caution banner present | Every applicable Markdown file starts with the current banner | Anything about the schema text |
| Tooling tests | The tools in `tools/` behave as their tests describe | Anything about the schema text |
| Internal links and anchors | Relative links and anchors in Markdown files resolve, and every issue form offers the same guides and sections as the contents page | That external websites are reachable |
| Markdown formatting | Markdown files follow the rules in `.markdownlint-cli2.jsonc` | That the text is correct |
| Data files match the schema | The data files written by a tool are up to date, and `data-dictionary.csv` lists every element in the data model | That hand-written descriptions, views and diagrams are correct |

The **Reading site** workflow also runs on every pull request and every change to `main`:

| Check | Confirms | Does not confirm |
| --- | --- | --- |
| Build and check the site | The site builds, its rendering tests pass, and every page has working internal links and anchors, working downloads, ordered headings, table headings, image alt text and the draft banner. The tests include showing every example and table cell in the section files exactly as written | That the site is published, or anything about the schema text |

The **External checks** workflow runs once a week and can be run by hand. It depends on other websites, so it is kept apart from the checks on pull requests.

| Check | Confirms | Does not confirm |
| --- | --- | --- |
| External links | Links to other websites respond. A link is tried again before it is reported | That the page still says what the link implies |
| GOV.UK matches the published baseline | The text on GOV.UK still matches the latest `published-X.Y` tag. It is skipped until a tag exists | Anything about the working draft on `main` |

On a pull request, GitHub runs the workflows and tools as changed by that pull request. A passing check therefore does not show that the checks themselves were left intact. Review changes to `.github/` and `tools/` with that in mind.

## Reading site

The [reading site](https://ofdia-uk.github.io/dvs-data-schema/) shows the working draft to people who would rather not use GitHub. It renders the Markdown files directly and keeps no copy of the text. Changes to `main` are published automatically. Pull requests are built and checked but never published. The site is not part of GOV.UK, so it uses the GOV.UK Design System's Generic header and none of the GOV.UK branding. It uses the same design as the trust framework reading site. [`docs-site/README.md`](docs-site/README.md) explains how it works, how to run it, and how to publish a preview from a fork.

## Run the checks in a local copy

You need Python 3. For the Markdown formatting check you also need Node.js.

```sh
python tools/caution_banner.py --check
python -m unittest discover -s tools/tests
python tools/check_links.py
python tools/machine_readable.py --check
npx markdownlint-cli2
```

## Issue labels

The issue forms apply these labels. They must exist in the repository for the forms to label issues.

| Label | Applied by |
| --- | --- |
| `triage` | Every issue form, until a maintainer has reviewed the issue |
| `proposed change` | Schema feedback |
| `draft clarity` | Unclear wording |
| `correction` | Correction, and Broken link or navigation problem |
| `accessibility` | Accessibility problem |
| `suggestion` | Other suggestion |
