#!/usr/bin/env python3
"""Check the built reading site for broken links and basic structural problems.

Run after building the site:
    python tools/check_site.py docs-site/_site

For every HTML page it checks that:

- each internal link and #anchor points to a page and element that exist;
- the page has a language, a title and exactly one <h1>, and its heading
  levels do not skip (for example from <h2> straight to <h4>);
- no ID is used twice on a page, because a link to it would be ambiguous;
- every image has an alt attribute;
- every table has column headings;
- the draft status banner is present;
- no repository-only material (the caution banner markers or the
  "Repository navigation" footer) has leaked into the page.

Links to files, such as the stylesheet and the data files readers can
download, are checked in the same way as links to pages.

External links are not checked.

Pass --path-prefix if the site was built for a sub-path, for example
--path-prefix /dvs-data-schema/ for a GitHub Pages project site.
"""

from __future__ import annotations

import argparse
import os
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

EXTERNAL_SCHEMES = {"http", "https", "mailto", "tel"}


class Page(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: set[str] = set()
        self.repeated_ids: set[str] = set()
        self.links: list[str] = []
        self.headings: list[int] = []
        self.images_without_alt = 0
        self.tables_without_column_headings = 0
        self.open_tables: list[bool] = []  # for each table being read: has a column heading been seen?
        self.lang = ""
        self.has_title = False
        self.has_phase_banner = False
        self.text: list[str] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            if a["id"] in self.ids:
                self.repeated_ids.add(a["id"])
            self.ids.add(a["id"])
        if tag == "table":
            self.open_tables.append(False)
        if tag == "th" and a.get("scope") == "col" and self.open_tables:
            self.open_tables[-1] = True
        if tag == "a" and a.get("name"):
            self.ids.add(a["name"])
        if tag == "html":
            self.lang = a.get("lang", "")
        if tag == "title":
            self.has_title = True
        if tag in ("a", "link") and a.get("href"):
            self.links.append(a["href"])
        if tag in ("img", "script") and a.get("src"):
            self.links.append(a["src"])
        if tag == "img" and "alt" not in a:
            self.images_without_alt += 1
        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self.headings.append(int(tag[1]))
        if "govuk-phase-banner" in (a.get("class") or "").split():
            self.has_phase_banner = True

    def handle_endtag(self, tag):
        if tag == "table" and self.open_tables and not self.open_tables.pop():
            self.tables_without_column_headings += 1

    def handle_data(self, data):
        self.text.append(data)

    def handle_comment(self, data):
        self.text.append(f"<!--{data}-->")


def parse(path: Path) -> Page:
    page = Page()
    page.feed(path.read_text(encoding="utf-8"))
    return page


def resolve(site: Path, page_path: Path, href: str, prefix: str) -> tuple[Path | None, str]:
    """Map an internal link to (file in the built site, fragment). None means external."""
    parts = urlsplit(href)
    if parts.scheme in EXTERNAL_SCHEMES:
        return None, ""
    if parts.scheme or parts.netloc:
        return site / f"__unexpected_url__{parts.scheme}", ""
    path = unquote(parts.path)
    if not path:
        return page_path, parts.fragment
    if path.startswith("/"):
        if not path.startswith(prefix):
            return site / "__outside_path_prefix__", ""
        target = site / path[len(prefix):]
    else:
        target = (page_path.parent / path).resolve()
    if path.endswith("/") or target.is_dir():
        target = target / "index.html"
    return target, parts.fragment


def check(site: Path, prefix: str) -> list[str]:
    problems: list[str] = []
    pages = {p.resolve(): parse(p) for p in site.rglob("*.html")}
    if not pages:
        return [f"no HTML pages found in {site}"]
    for path, page in sorted(pages.items()):
        rel = path.relative_to(site.resolve()).as_posix()
        text = "".join(page.text)
        if not page.lang:
            problems.append(f"{rel}: <html> has no lang attribute")
        if not page.has_title:
            problems.append(f"{rel}: page has no <title>")
        if page.headings.count(1) != 1:
            problems.append(f"{rel}: expected exactly one <h1>, found {page.headings.count(1)}")
        for before, after in zip(page.headings, page.headings[1:]):
            if after > before + 1:
                problems.append(f"{rel}: heading level jumps from <h{before}> to <h{after}>")
                break
        for repeated in sorted(page.repeated_ids):
            problems.append(f"{rel}: the ID {repeated!r} is used more than once")
        if page.images_without_alt:
            problems.append(f"{rel}: {page.images_without_alt} image(s) without an alt attribute")
        if page.tables_without_column_headings:
            problems.append(f"{rel}: {page.tables_without_column_headings} table(s) without column headings")
        if not page.has_phase_banner:
            problems.append(f"{rel}: draft status banner is missing")
        for leaked in ("caution-banner:", "Repository navigation"):
            if leaked in text:
                problems.append(f"{rel}: repository-only text leaked into the page: {leaked!r}")
        for href in page.links:
            target, fragment = resolve(site.resolve(), path, href, prefix)
            if target is None:
                continue
            if not target.exists():
                problems.append(f"{rel}: broken link: {href}")
            elif fragment and target.suffix == ".html":
                ids = pages[target.resolve()].ids if target.resolve() in pages else parse(target).ids
                if fragment not in ids:
                    problems.append(f"{rel}: missing anchor: {href}")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description="Check the built reading site.")
    parser.add_argument("site", type=Path, help="the built site directory, for example docs-site/_site")
    parser.add_argument("--path-prefix", default="/", help="URL prefix the site was built for (default: /)")
    args = parser.parse_args()
    prefix = args.path_prefix if args.path_prefix.endswith("/") else args.path_prefix + "/"
    problems = check(args.site, prefix)
    for problem in problems:
        if os.environ.get("GITHUB_ACTIONS") == "true":
            print(f"::error::{problem}")
        else:
            print(f"ERROR: {problem}")
    pages = len(list(args.site.rglob("*.html")))
    if problems:
        print(f"\n{len(problems)} problem(s) found in {pages} pages.")
        return 1
    print(f"{pages} pages checked: links, anchors, headings, tables, images and status banner are all in order.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
