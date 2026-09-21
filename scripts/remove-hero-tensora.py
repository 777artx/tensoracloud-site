from pathlib import Path
import re

p = Path(r"C:\Users\thepa\The Network\unkey-local\index.html")
html = p.read_text(encoding="utf-8")
html = re.sub(
    r"(The market for inference and compute\.)<br\s*/?>\s*<span class=\"hero-tensora[^\"]*\">Tensora\.</span>",
    r"\1",
    html,
)
html = html.replace(
    "The market for inference and compute.\\nTensora.",
    "The market for inference and compute.",
)
p.write_text(html, encoding="utf-8")
print("hero-tensora left:", "hero-tensora" in html)
idx = html.find("The market for inference")
print(repr(html[idx : idx + 120]))
