"""Apply new Tensora landing + docs copy to unkey-local HTML."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(r"C:\Users\thepa\The Network\unkey-local")

# Order matters: longer / more specific strings first where they overlap.
INDEX_REPLACEMENTS: list[tuple[str, str]] = [
    # Meta
    (
        "Tensora Cloud | One cloud for AI software",
        "Tensora Cloud | Infrastructure for AI software",
    ),
    (
        "Tensora gives AI software access to models, GPU compute, tools, and payments through one cloud.",
        "Access models, GPU compute, and tools through one cloud. Tensora handles usage, payments, and infrastructure behind the scenes.",
    ),
    (
        "Models, compute, tools, and payments for AI software. One account. Pay as you go.",
        "Models, GPUs, and tools for AI software. One account. Pay for what you use.",
    ),
    # Hero
    (
        "Everything AI software needs to run.",
        "AI software gets its infrastructure through Tensora.",
    ),
    (
        "Access models, GPU compute, tools, and payments through one cloud. Connect once. Use what you need. Pay as you go.",
        "Access models, GPU compute, and tools from one account. Use what you need and pay for what you use.",
    ),
    # Problem
    (
        "AI infrastructure is fragmented. Tensora puts it in one place.",
        "Models, GPUs, and tools should not live in separate systems.",
    ),
    (
        "Instead of managing separate model providers, GPU clouds, tools, and billing accounts, connect to Tensora and access what your software needs through one account.",
        "Tensora brings AI infrastructure behind one account so software can access what it needs, pay as it goes, and keep running.",
    ),
    # Feature cards
    (
        "Call the model you need.",
        "Use the right model for the job.",
    ),
    (
        "Access supported AI models through one API without managing separate accounts and providers.",
        "Access leading AI models through one API. Choose one yourself or let Tensora route the request.",
    ),
    (
        "Get GPUs when you need them.",
        "Find the compute you need.",
    ),
    (
        "Find and purchase available GPU capacity across infrastructure providers from one place.",
        "Compare GPU pricing and capacity across infrastructure providers and choose the best available offer.",
    ),
    (
        "Give your software more to work with.",
        "Give your software more capabilities.",
    ),
    (
        "Connect APIs, MCPs, and services through the same infrastructure layer.",
        "Connect APIs, MCPs, and services for search, browsers, data, payments, code, and more.",
    ),
    (
        "Pay as the work happens.",
        "Pay for usage as it happens.",
    ),
    (
        "Fund once with USDC and pay programmatically as models, compute, and tools are used.",
        "Fund one account and pay for models, compute, and tools programmatically as your software uses them.",
    ),
    # Build & Deploy
    ("Build &amp; Deploy", "How it works"),
    ("Build & Deploy", "How it works"),
    (
        "Connect. Fund. Run. Tensora handles the infrastructure behind it.",
        "Connect once. Use what you need. Pay as you go.",
    ),
    (
        "Connect your software, add USDC, and access models, compute, and tools through one account.",
        "Give your software access to Tensora and use models, compute, and tools without managing separate providers and billing systems.",
    ),
    # Steps — labels in nav + body. Do Choose→Access and Observe→Track carefully.
    (">Choose<", ">Access<"),
    (">Observe<", ">Track<"),
    ("Connect your software", "Get access to Tensora"),
    ("One connection to Tensora", "One account and one API key"),
    (
        "Connect an application, agent, or workload and start accessing infrastructure through one account.",
        "Connect your application, agent, or workload once.",
    ),
    ("Choose what it needs", "Choose what it needs"),  # same title kept for Access step body title
    # Access step body was under Choose — update body strings
    (
        "Use inference, GPUs, APIs, MCPs, browser workloads, or persistent processes as the job requires.",
        "Use a model, find compute, or connect an API or MCP from the same account.",
    ),
    ("Add USDC", "Add a balance"),
    (
        "Fund your account once and pay for infrastructure automatically as it is used.",
        "Fund your account once and use it across supported infrastructure.",
    ),
    ("Let it run", "Let Tensora handle the rest"),
    # Run step subtitle only (Scale card keeps "Infrastructure on demand")
    (
        'Let Tensora handle the rest</h3><p class="text-gray-60">Infrastructure on demand</p>',
        'Let Tensora handle the rest</h3><p class="text-gray-60">Infrastructure when you need it</p>',
    ),
    (
        'Let Tensora handle the rest\\"}],[\\"$\\",\\"p\\",null,{\\"className\\":\\"text-gray-60\\",\\"children\\":\\"Infrastructure on demand\\"}]',
        'Let Tensora handle the rest\\"}],[\\"$\\",\\"p\\",null,{\\"className\\":\\"text-gray-60\\",\\"children\\":\\"Infrastructure when you need it\\"}]',
    ),
    (
        "Tensora finds the resource, routes the request, handles payment, and keeps the workload moving.",
        "Requests move through Tensora, providers fulfill the work, and usage is charged automatically.",
    ),
    ("Watch it happen", "See everything happening"),
    ("Usage and payments in one place", "Usage, spend, and payments"),
    (
        "See jobs, model requests, compute usage, USDC spend, and live activity as they happen.",
        "See model requests, compute usage, tool activity, payments, and costs in one place.",
    ),
    # Gateway
    (">Gateway<", ">Tensora Gateway<"),
    (
        "One place for the infrastructure behind AI software.",
        "One account for the infrastructure behind AI software.",
    ),
    (
        "Find and purchase GPU capacity across available infrastructure providers without managing separate cloud accounts.",
        "Compare GPU capacity and pricing across infrastructure providers and access the compute your software needs.",
    ),
    (
        "Access supported AI models through the same account that powers your workloads.",
        "Use supported AI models through one API and keep model usage and billing in one place.",
    ),
    (
        "Connect APIs, MCPs, and services your software needs to complete work.",
        "Connect APIs, MCPs, and services that give your software more capabilities.",
    ),
    (
        "Pay for infrastructure programmatically with USDC as usage happens.",
        "Pay for infrastructure programmatically as usage happens.",
    ),
    (
        "See jobs, requests, compute usage, payments, and activity in one place.",
        "See requests, compute usage, tool activity, payments, and spend in one place.",
    ),
    # Stats
    (
        "Earned from infrastructure usage across Tensora.",
        "Earned by Tensora from infrastructure usage.",
    ),
    (
        "Workloads processed through Tensora.",
        "Requests and workloads processed through Tensora.",
    ),
    (
        "Real usage. Real infrastructure. Real revenue.",
        "Real usage. Real payments. Real revenue.",
    ),
    # Scale
    (">Scale<", ">Why Tensora<"),
    (
        "Software is becoming a customer.",
        "Software is becoming an infrastructure customer.",
    ),
    (
        "AI software can call APIs, hold funds, and make decisions. Tensora gives it a way to buy the models, compute, and tools it needs to keep working.",
        "AI software can choose models, call APIs, use compute, and make payments on its own. Tensora gives it one place to access the infrastructure behind that work.",
    ),
    (
        "Connect once and access models, compute, tools, and payments through Tensora.",
        "Access models, compute, tools, and payments without managing separate infrastructure accounts.",
    ),
    # "Infrastructure on demand" already used above for Run step — scale card may still say old body
    (
        "Tensora finds available infrastructure behind the scenes. Your software requests what it needs and gets a price.",
        "Your software requests what it needs. Tensora finds the available option and returns the price.",
    ),
    ("USDC balances", "One balance"),
    (
        "Fund the account once and pay for infrastructure from one USDC balance as work happens.",
        "Fund usage once and pay for supported infrastructure from the same account.",
    ),
    (
        "Software can purchase infrastructure automatically, turning cloud resources into something software can buy for itself.",
        "Software can access and pay for infrastructure as it works without waiting for a human to manage every purchase.",
    ),
    # Live Activity
    (
        "See the network working.",
        "Watch infrastructure move through Tensora.",
    ),
    (
        "Watch model requests, compute jobs, payments, and usage appear as they happen.",
        "See model requests, GPU activity, tool usage, and payments as they happen.",
    ),
    (
        "See what infrastructure was purchased, what it cost, and which provider fulfilled it.",
        "See what was used, which provider handled it, and what it cost.",
    ),
    (
        "Inspect individual jobs, timestamps, spend, status, and transaction activity.",
        "Inspect timestamps, request details, spend, status, and onchain transactions.",
    ),
    (
        "Track the usage that generates revenue for Tensora.",
        "Follow the usage that generates revenue for Tensora.",
    ),
    # AIO portal
    ("AIO Developer Portal", "Developer Access"),
    (
        "From fragmented infrastructure to one cloud.",
        "One integration instead of a stack of infrastructure accounts.",
    ),
    (
        "Before: Models live in one account.",
        "Before: Models live with one provider.",
    ),
    (
        "GPUs live in another. Tools, API keys, billing systems, and providers are managed separately.",
        "GPUs live somewhere else. Tools, API keys, payments, and billing are managed across separate systems.",
    ),
    (
        "It requests what it needs, pays for usage, runs the job, and keeps working.",
        "It accesses what it needs, pays for usage, and keeps working through one account.",
    ),
    (
        "Tensora handles the infrastructure behind it.",
        "Tensora gives it access to the infrastructure behind it.",
    ),
    # Footer
    (
        "One cloud for AI software.",
        "Infrastructure for AI software.",
    ),
]

# Fix Choose step: title was "Choose what it needs" — Access step should keep that
# But we need to update Connect step title already done.
# Also "Models, compute, and tools" as Access subtitle stays.

DOCS_REPLACEMENTS: list[tuple[str, str]] = [
    (
        'content="How to use Tensora. Get a key, fund usage, call models, rent GPUs, and connect tools."',
        'content="Learn how to access models, compare GPU compute, connect tools, fund usage, and track activity through Tensora."',
    ),
    (
        "Everything you need to use Tensora. Get a key, fund usage, call models, rent GPUs, and connect tools.",
        "Everything you need to use Tensora. Create a key, fund usage, access models, find compute, connect tools, and track what your software spends.",
    ),
    (
        "Tensora is crypto-native AI infrastructure. You route models, rent GPUs, and connect tools from one place. Usage settles in USDC, USDG, or a card top-up.",
        "Tensora is infrastructure for AI software. It gives applications and agents one place to access models, GPU compute, APIs, MCPs, and payments.",
    ),
    (
        "Lab is the operator surface. Create a key, fund a project, and watch your ledger as work runs.",
        "Usage can settle through supported stablecoins or card-funded balances. The Tensora app is where you create access keys, fund projects, and track requests, usage, and payments.",
    ),
    (
        "Open API Access in Lab.",
        "Open API Access.",
    ),
    (
        "Send it as a Bearer token on API requests.",
        "Send it as a Bearer token with API requests.",
    ),
    (
        "The key unlocks the API. Your balance on Billing pays for usage.",
        "Your API key gives your software access to supported Tensora services. Your project balance pays for usage.",
    ),
    (
        "Home, Models, Compute, Tools, and Docs stay open without an account. API Access, Activity, Billing, and Dashboard need a signed-in session.",
        "Home, Models, Compute, Tools, and Docs are available without an account. API Access, Activity, Billing, and Dashboard require a signed-in session.",
    ),
    (
        "Fund usage with USDC on Base, USDG, other crypto, or a credit card. Open Billing in Lab to deposit.",
        "Fund usage with supported stablecoins or a credit card. Open Billing to add funds and track spend.",
    ),
    (
        "Use tensora/auto to let the router choose, or pin a model from the catalog. Requests follow an OpenAI-compatible chat shape.",
        "Use tensora/auto to let Tensora select a model based on your preference, or choose a specific model from the catalog. Model requests use an OpenAI-compatible chat format where supported.",
    ),
    (
        "Compute lists GPU offers by region. Renting requires sign-in. Tools connects APIs and MCPs to your project. Connect is gated the same way.",
        "Compute lets you compare GPU pricing and availability across infrastructure providers. Offers that support direct Tensora provisioning can be purchased through Tensora. Other offers link to the provider.</p>\n      <p>Tools lets you discover and connect supported APIs and MCPs to your project.",
    ),
    (
        "Activity is your personal ledger. Billing shows balances, deposits, and usage cost. Dashboard summarizes spend and recent events for your account only.",
        "Activity is the record of what your software has done through Tensora. See model requests, compute activity, tool usage, payments, timestamps, and status.</p>\n      <p>Billing shows your balance, deposits, infrastructure spend, and supported payment activity. Dashboard summarizes usage across your account.",
    ),
    (
        "USDC on Base is the primary stablecoin path for Lab credits. USDG is the Robinhood dollar option for funding. Explorer links show up on payment activity when available.",
        "Supported stablecoins can be used to fund Tensora usage. Onchain payment activity includes explorer links when transaction data is available.",
    ),
]


def apply(path: Path, pairs: list[tuple[str, str]]) -> None:
    text = path.read_text(encoding="utf-8")
    missing: list[str] = []
    for old, new in pairs:
        if old == new:
            continue
        if old not in text:
            missing.append(old[:80])
            continue
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")
    print(f"{path.name}: applied, {len(missing)} missing")
    for m in missing:
        print(f"  MISS: {m!r}")


def main() -> None:
    apply(ROOT / "index.html", INDEX_REPLACEMENTS)
    apply(ROOT / "docs.html", DOCS_REPLACEMENTS)


if __name__ == "__main__":
    main()
