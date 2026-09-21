"""Apply latest Tensora landing + docs copy (v3). Replacements relative to current HTML."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(r"C:\Users\thepa\The Network\unkey-local")

INDEX: list[tuple[str, str]] = [
    # Meta
    (
        "Tensora Cloud | Infrastructure for AI software",
        "Tensora Cloud | Models, GPUs, and tools for AI software",
    ),
    (
        "Access models, GPU compute, and tools through one cloud. Tensora handles usage, payments, and infrastructure behind the scenes.",
        "Tensora gives AI software one place to access models, GPU compute, tools, and payments.",
    ),
    (
        "Models, GPUs, and tools for AI software. One account. Pay for what you use.",
        "AI software uses Tensora to access models, GPUs, and tools and pay for what it uses.",
    ),
    # Hero
    (
        "AI software gets its infrastructure through Tensora.",
        "AI software buys models, GPUs, and tools through Tensora.",
    ),
    (
        "Access models, GPU compute, and tools from one account. Use what you need and pay for what you use.",
        "One place to access AI infrastructure, pay for usage, and keep software running.",
    ),
    # Problem
    (
        "Models, GPUs, and tools should not live in separate systems.",
        "AI software needs more than a model.",
    ),
    (
        "Tensora brings AI infrastructure behind one account so software can access what it needs, pay as it goes, and keep running.",
        "It needs models, GPUs, APIs, tools, and payments. Tensora puts them in one place so software can get what it needs without managing a stack of separate providers.",
    ),
    # Feature cards
    (
        "Use the right model for the job.",
        "Use any supported model.",
    ),
    (
        "Access leading AI models through one API. Choose one yourself or let Tensora route the request.",
        "Access leading AI models through one API. Pick the model yourself or let Tensora choose based on speed, cost, or quality.",
    ),
    (
        "Find the compute you need.",
        "Find the right GPU.",
    ),
    (
        "Compare GPU pricing and capacity across infrastructure providers and choose the best available offer.",
        "Compare GPU pricing and capacity across providers and choose the best available offer.",
    ),
    (
        "Connect APIs, MCPs, and services for search, browsers, data, payments, code, and more.",
        "Connect APIs and MCPs for search, browsers, databases, payments, code, and more.",
    ),
    (
        "Pay for usage as it happens.",
        "Pay for what gets used.",
    ),
    (
        "Fund one account and pay for models, compute, and tools programmatically as your software uses them.",
        "Fund one balance and pay for models, GPUs, and tools as your software uses them.",
    ),
    # How it works
    (
        "Connect once. Use what you need. Pay as you go.",
        "Get access. Use infrastructure. Pay as you go.",
    ),
    (
        "Give your software access to Tensora and use models, compute, and tools without managing separate providers and billing systems.",
        "Tensora gives software one place to access models, compute, and tools without managing separate accounts and billing systems.",
    ),
    # Steps: Access → Choose (nav + was Access)
    (">Access<", ">Choose<"),
    (
        "Connect your application, agent, or workload once.",
        "Connect your application or agent once.",
    ),
    (
        "Choose what it needs",
        "Pick what it needs",
    ),
    (
        "Use a model, find compute, or connect an API or MCP from the same account.",
        "Choose a model, find compute, or connect an API or MCP.",
    ),
    (
        "Let Tensora handle the rest",
        "Use the infrastructure",
    ),
    (
        "Infrastructure when you need it",
        "Tensora handles the access",
    ),
    (
        "Requests move through Tensora, providers fulfill the work, and usage is charged automatically.",
        "Your software makes the request, the provider does the work, and usage is charged automatically.",
    ),
    (
        "Usage, spend, and payments",
        "Usage, payments, and cost",
    ),
    (
        "See model requests, compute usage, tool activity, payments, and costs in one place.",
        "See model requests, GPU usage, tool activity, payments, and spend in one place.",
    ),
    # Gateway
    (
        "One account for the infrastructure behind AI software.",
        "Everything AI software needs behind one account.",
    ),
    (
        "Compare GPU capacity and pricing across infrastructure providers and access the compute your software needs.",
        "Compare GPU pricing and capacity across providers and access the compute your software needs.",
    ),
    (
        "Use supported AI models through one API and keep model usage and billing in one place.",
        "Use supported AI models through one API and keep usage and billing in one place.",
    ),
    (
        "Connect APIs, MCPs, and services that give your software more capabilities.",
        "Connect APIs and MCPs that give your software more capabilities.",
    ),
    (
        "Pay for infrastructure programmatically as usage happens.",
        "Pay for infrastructure automatically as it is used.",
    ),
    (
        "See requests, compute usage, tool activity, payments, and spend in one place.",
        "See requests, usage, payments, providers, and spend in one place.",
    ),
    # Scale
    (
        "Software is becoming an infrastructure customer.",
        "Software is starting to buy its own infrastructure.",
    ),
    (
        "AI software can choose models, call APIs, use compute, and make payments on its own. Tensora gives it one place to access the infrastructure behind that work.",
        "AI software can choose models, call APIs, use GPUs, and make payments. Tensora gives it one place to do all of that.",
    ),
    (
        "Access models, compute, tools, and payments without managing separate infrastructure accounts.",
        "Models, compute, tools, and payments without a stack of separate provider accounts.",
    ),
    (
        "Your software requests what it needs. Tensora finds the available option and returns the price.",
        "Your software asks for what it needs. Tensora finds the available option and shows the price.",
    ),
    (
        "Software can access and pay for infrastructure as it works without waiting for a human to manage every purchase.",
        "Software can access and pay for infrastructure as it works without waiting for a human to manage every request.",
    ),
    # Live Activity
    (
        "Watch infrastructure move through Tensora.",
        "Watch money and infrastructure move through Tensora.",
    ),
    (
        "Inspect timestamps, request details, spend, status, and onchain transactions.",
        "Inspect timestamps, spend, status, and onchain transactions.",
    ),
    # Developer Access
    (
        "One integration instead of a stack of infrastructure accounts.",
        "One connection instead of a stack of infrastructure accounts.",
    ),
    (
        "It accesses what it needs, pays for usage, and keeps working through one account.",
        "It gets access to what it needs, pays for usage, and keeps running through one account.",
    ),
    (
        "Tensora gives it access to the infrastructure behind it.",
        "Tensora handles access to the infrastructure behind it.",
    ),
    # Footer
    (
        "Infrastructure for AI software.",
        "Models, compute, and tools for AI software.",
    ),
]

DOCS: list[tuple[str, str]] = [
    (
        'content="Learn how to access models, compare GPU compute, connect tools, fund usage, and track activity through Tensora."',
        'content="Learn how to use models, compare GPU compute, connect tools, fund usage, and track activity through Tensora."',
    ),
    (
        "Everything you need to use Tensora. Create a key, fund usage, access models, find compute, connect tools, and track what your software spends.",
        "Everything you need to use Tensora. Create a key, fund your account, use models, find GPUs, connect tools, and track what your software spends.",
    ),
    (
        "Tensora is infrastructure for AI software. It gives applications and agents one place to access models, GPU compute, APIs, MCPs, and payments.",
        "Tensora gives AI software one place to access models, GPU compute, APIs, MCPs, and payments.",
    ),
    (
        "Usage can settle through supported stablecoins or card-funded balances. The Tensora app is where you create access keys, fund projects, and track requests, usage, and payments.",
        "Instead of managing separate providers, accounts, and billing systems, software connects to Tensora and uses what it needs from one account.</p>\n      <p>The Tensora app is where you create API keys, fund usage, and track requests, payments, and infrastructure activity.",
    ),
    (
        "Your API key gives your software access to supported Tensora services. Your project balance pays for usage.",
        "One Tensora API key gives your software access to supported services. Your project balance pays for usage.",
    ),
    (
        "Fund usage with supported stablecoins or a credit card. Open Billing to add funds and track spend.",
        "Fund your balance with supported stablecoins or other available payment methods. Open Billing to add funds and track spend.",
    ),
    (
        "Use tensora/auto to let Tensora select a model based on your preference, or choose a specific model from the catalog. Model requests use an OpenAI-compatible chat format where supported.",
        "Use tensora/auto to let Tensora choose a model based on speed, cost, or quality. You can also select a specific model from the catalog.</p>\n      <p>Supported model requests use an OpenAI-compatible chat format.",
    ),
    (
        "Compute lets you compare GPU pricing and availability across infrastructure providers. Offers that support direct Tensora provisioning can be purchased through Tensora. Other offers link to the provider.</p>\n      <p>Tools lets you discover and connect supported APIs and MCPs to your project.",
        "Compute lets you compare GPU pricing and availability across infrastructure providers.</p>\n      <p>Offers with direct Tensora support can be purchased through Tensora. Other offers take you directly to the provider.</p>\n      <p>Tools lets you discover and connect supported APIs and MCPs to your project.",
    ),
    (
        "Activity is the record of what your software has done through Tensora. See model requests, compute activity, tool usage, payments, timestamps, and status.</p>\n      <p>Billing shows your balance, deposits, infrastructure spend, and supported payment activity. Dashboard summarizes usage across your account.",
        "Activity shows what your software has done through Tensora, including model requests, compute activity, tool usage, payments, timestamps, and status.</p>\n      <p>Billing shows your balance, deposits, infrastructure spend, and payment activity. Dashboard summarizes usage across your account.",
    ),
    (
        "Supported stablecoins can be used to fund Tensora usage. Onchain payment activity includes explorer links when transaction data is available.",
        "Supported stablecoins can be used to fund Tensora usage. When a payment settles onchain, Tensora shows the transaction and explorer link when available.",
    ),
]


def apply(path: Path, pairs: list[tuple[str, str]]) -> None:
    text = path.read_text(encoding="utf-8")
    missing: list[str] = []
    for old, new in pairs:
        if old == new:
            continue
        count = text.count(old)
        if count == 0:
            missing.append(old[:90])
            continue
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")
    print(f"{path.name}: {len(missing)} missing of {len(pairs)}")
    for m in missing:
        print(f"  MISS: {m!r}")


def main() -> None:
    apply(ROOT / "index.html", INDEX)
    apply(ROOT / "docs.html", DOCS)


if __name__ == "__main__":
    main()
