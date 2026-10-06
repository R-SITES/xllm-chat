#!/usr/bin/env python3
"""Scrub the maintainer's first name from source before publishing.

Some code comments in this tree attributed feedback or a spec to the maintainer by
name. Replace those with neutral phrasing that keeps the meaning ("user feedback",
"the user's ask"), so the comment stays useful and no personal identifier ships in a
public repo.

The name being scrubbed is not written literally here on purpose: this script is
itself a tracked file, so hard-coding the name would defeat the point. It is derived
from the site identity used elsewhere in the project via --name (default: the
git config user.name first token is NOT used; pass it explicitly).

Run: python3 scripts/scrub_identifiers.py <file> [<file> ...] --name <FirstName>
Prints a per-file count of replacements.
"""
import re
import sys


def build_rules(name: str):
    n = re.escape(name)
    return [
        # "Name (2026-10-04): \"quote\"" -> "user feedback (2026-10-04): \"quote\""
        (re.compile(rf"\b{n}\s*\((\d{{4}}-\d{{2}}-\d{{2}})\)\s*:\s*\""), r'user feedback (\1): "'),
        # "Name: \"quote\"" -> "user feedback: \"quote\""  (verbatim request)
        (re.compile(rf"\b{n}\s*:\s*\""), 'user feedback: "'),
        # "Name: rest of sentence" -> "user feedback: rest"
        (re.compile(rf"\b{n}\s*:\s*(?=[^\"\n])"), "user feedback: "),
        # "Name's ask" / "Name's call" / "Name's popup" / "Name's phone screenshot"
        (re.compile(rf"\b{n}'s\b"), "the user's"),
        # "(Name 2026-10-04)" / ", Name 2026-09-25)" -> dated attribution
        (re.compile(rf"\(\s*{n}\s+(\d{{4}}-\d{{2}}-\d{{2}})"), r"(user \1"),
        (re.compile(rf",\s*{n}\s+(\d{{4}}-\d{{2}}-\d{{2}})"), r", user \1"),
        (re.compile(rf"\b{n}\s+(\d{{4}}-\d{{2}}-\d{{2}})"), r"user \1"),
        # remaining bare "Name" -> "the user"
        (re.compile(rf"\b{n}\b"), "the user"),
    ]


def scrub(text: str, rules) -> tuple[str, int]:
    total = 0
    for pat, repl in rules:
        text, n = pat.subn(repl, text)
        total += n
    return text, total


def main(argv):
    args = list(argv)
    name = None
    if "--name" in args:
        i = args.index("--name")
        name = args[i + 1]
        del args[i:i + 2]
    if not name:
        sys.exit("usage: scrub_identifiers.py <file> [...] --name <FirstName>")
    rules = build_rules(name)
    grand = 0
    for p in args:
        with open(p, encoding="utf-8") as fh:
            src = fh.read()
        out, n = scrub(src, rules)
        if n:
            with open(p, "w", encoding="utf-8") as fh:
                fh.write(out)
        print(f"{p}: {n} replacement(s)")
        grand += n
    print(f"total: {grand}")


if __name__ == "__main__":
    main(sys.argv[1:])
