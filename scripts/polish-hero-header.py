"""Hero + header polish for Tensora landing."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(r"C:\Users\thepa\The Network\unkey-local")
INDEX = ROOT / "index.html"
BRAND = ROOT / "images" / "brand"
APP_BRAND = Path(r"C:\Users\thepa\The Network\tensora-app\public\brand")


def ensure_white_logo() -> None:
    BRAND.mkdir(parents=True, exist_ok=True)
    src = APP_BRAND / "logo-lockup-white.png"
    if not src.exists():
        # invert black lockup
        black = APP_BRAND / "logo-lockup.png"
        im = Image.open(black).convert("RGBA")
        r, g, b, a = im.split()
        white = Image.new("L", im.size, 255)
        Image.merge("RGBA", (white, white, white, a)).save(src)
    dest = BRAND / "logo-header-white.png"
    im = Image.open(src).convert("RGBA")
    im.thumbnail((580, 112), Image.Resampling.LANCZOS)
    im.save(dest, optimize=True)
    print("wrote", dest, im.size)


NAV_BTN = (
    'inline-flex items-center justify-center h-11 gap-1.5 font-medium tracking-tight '
    'transition duration-200 ease-in-out border border-white/20 bg-transparent '
    'text-white hover:bg-white/10 px-5 text-sm'
)

OLD_ACTIONS = None  # filled at runtime


def main() -> None:
    ensure_white_logo()
    html = INDEX.read_text(encoding="utf-8")

    # --- Header bar: white → black ---
    html = html.replace(
        'relative z-60 flex h-11 flex-1 items-center justify-between bg-foreground pr-0 pl-6',
        'relative z-60 flex h-11 flex-1 items-center justify-between bg-[#0a0a0b] border border-white/15 pr-0 pl-6',
        1,
    )
    # Logo → white lockup
    html = html.replace(
        'src="images/brand/logo-header.png?v=4"',
        'src="images/brand/logo-header-white.png?v=5"',
    )
    # Mobile menu button
    html = html.replace(
        'class="relative z-60 flex size-11 items-center justify-center bg-foreground lg:hidden"',
        'class="relative z-60 flex size-11 items-center justify-center bg-[#0a0a0b] border border-white/15 lg:hidden"',
        1,
    )
    # Hamburger lines: were bg-background (black on white) → white on black
    html = html.replace(
        'class="absolute left-0 block h-0.5 w-full bg-background transition-all duration-300 top-1"',
        'class="absolute left-0 block h-0.5 w-full bg-white transition-all duration-300 top-1"',
    )
    html = html.replace(
        'class="absolute top-1/2 left-0 block h-0.5 w-full -translate-y-1/2 bg-background transition-opacity duration-300 opacity-100"',
        'class="absolute top-1/2 left-0 block h-0.5 w-full -translate-y-1/2 bg-white transition-opacity duration-300 opacity-100"',
    )
    html = html.replace(
        'class="absolute left-0 block h-0.5 w-full bg-background transition-all duration-300 bottom-1"',
        'class="absolute left-0 block h-0.5 w-full bg-white transition-all duration-300 bottom-1"',
    )

    # Consistent action buttons: Docs / X / App
    x_svg = (
        '<svg aria-hidden="true" fill="currentColor" height="16" viewBox="0 0 24 24" width="16" '
        'xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817'
        "L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z\"></path></svg>"
    )
    new_nav = (
        f'<nav aria-label="Actions" class="hidden items-center gap-1 lg:flex">'
        f'<a class="{NAV_BTN}" href="docs.html"><span aria-hidden="true">📄</span> Docs</a>'
        f'<a aria-label="X (Twitter)" class="{NAV_BTN}" href="https://x.com/tensoracloud" '
        f'rel="noopener noreferrer" target="_blank">{x_svg}</a>'
        f'<a class="{NAV_BTN}" href="https://app.tensoracloud.xyz/lab/home">App</a>'
        f"</nav>"
    )

    # Replace existing Actions nav (desktop)
    start = html.find('<nav aria-label="Actions"')
    if start < 0:
        raise SystemExit("Actions nav not found")
    # find matching close — first </nav> after start that closes Actions
    end = html.find("</nav>", start)
    # There may be nested? Looking at structure — Actions nav has no nested nav, first </nav> is fine
    # But Primary navigation is empty before Actions. Confirm we hit Actions.
    assert 'aria-label="Actions"' in html[start : start + 40]
    html = html[:start] + new_nav + html[end + len("</nav>") :]

    # --- Hero copy ---
    old_h1 = (
        'AI software buys models, GPUs, and tools through Tensora.'
    )
    new_h1 = (
        'AI software buys models, GPUs, and tools.<br/>'
        '<span class="hero-tensora font-display tracking-[-0.04em]">Tensora.</span>'
    )
    if old_h1 not in html:
        # maybe already changed
        print("warn: old h1 missing")
    else:
        html = html.replace(old_h1, new_h1)

    # Remove subhead, keep CTA row
    old_sub = (
        '<p class="max-w-80 text-sm leading-snug font-normal tracking-[-0.01em] whitespace-pre-wrap '
        'text-gray-60 sm:text-base md:max-w-93.75 lg:max-w-132.75">'
        "One place to access AI infrastructure, pay for usage, and keep software running.</p>"
    )
    if old_sub in html:
        html = html.replace(old_sub, "")
    else:
        print("warn: subhead missing")

    # Tighten hero CTA row now that subhead is gone
    html = html.replace(
        'class="mt-4 flex flex-col gap-7 md:mt-5 md:flex-row md:items-end md:justify-between md:gap-5"',
        'class="mt-6 flex flex-col gap-5 md:mt-7 md:flex-row md:items-center md:justify-start md:gap-4"',
        1,
    )

    # Also update RSC payload strings if present
    html = html.replace(
        "AI software buys models, GPUs, and tools through Tensora.",
        "AI software buys models, GPUs, and tools.\\nTensora.",
    )
    html = html.replace(
        "One place to access AI infrastructure, pay for usage, and keep software running.",
        "",
    )

    # CSS polish
    css = """
<style id="tensora-hero-header-polish">
  .hero-tensora {
    display: inline-block;
    margin-top: 0.15em;
    font-weight: 600;
    letter-spacing: -0.045em;
    color: #fff;
  }
  header .container > div.bg-\\[\\#0a0a0b\\],
  header [class*="bg-[#0a0a0b]"] {
    background: #0a0a0b !important;
  }
</style>
"""
    if "tensora-hero-header-polish" not in html:
        html = html.replace("</head>", css + "</head>", 1)

    INDEX.write_text(html, encoding="utf-8")
    print("updated index.html")


if __name__ == "__main__":
    main()
