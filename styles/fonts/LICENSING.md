# ⚠️ Font licensing — required before going live

This project self-hosts **3MCircular**, a **proprietary** 3M brand typeface,
for visual fidelity in a presales redesign demo.

| File | Family | Weight | Foundry | Status |
|---|---|---|---|---|
| 3MCircularWeb-Light.woff | 3MCircular | 300 | 3M / Lineto (Circular base) | ⚠️ unverified |
| 3MCircularWeb-Book.woff | 3MCircular | 400 | 3M / Lineto | ⚠️ unverified |
| 3MCircularWeb-Bold.woff | 3MCircular | 700 | 3M / Lineto | ⚠️ unverified |

The woff files were lifted from the live 3M.com (already publicly served by
3M's own origin). **Do not publish to `aem.live` (production) until 3M's
webfont/embedding license is confirmed.**

**Remove path:** delete the three `.woff` files and their `@font-face` rules
in `styles/styles.css`. The stacks then fall back to
`"3MCircular-fallback", arial, sans-serif` (a metric-matched system face),
so layout is preserved — only the brand letterforms change.
