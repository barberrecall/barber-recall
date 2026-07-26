---
name: Wouter hash anchor fix
description: wouter's Link component intercepts all href clicks including hash anchors, preventing native browser scroll-to behavior.
---

Use a native `<button>` (or `<a>`) with `onClick={() => document.getElementById('section')?.scrollIntoView({ behavior: 'smooth' })}` for in-page anchor scrolling. Never use `<Link href="#section">` — wouter will treat it as a path change, update the URL, and not scroll.

**Why:** wouter's router intercepts all Link clicks via its history API integration. Hash hrefs are not special-cased, so `#pricing` becomes a path navigation attempt.

**How to apply:** Any landing page or single-page anchor link in a wouter-powered app.
