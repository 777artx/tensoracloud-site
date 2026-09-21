# Unkey — local landing page

Mirrored from https://www.unkey.com/ (landing page only).

## Preview

```bash
python -m http.server 8090 --directory "unkey-local"
```

Then open http://localhost:8090

## Notes

- Landing page only (not the whole site).
- Buttons/links are disabled (look real, do not navigate).
- Hero video replaced with HydraDB’s Unicorn Studio graph animation (`hydra-hero-test.html`, project `oUvrbeOq0WuFIWyfR7ZD` from hydradb.com).
- Re-apply with: `python inject_hydra_hero.py`
- Next.js static mirror under `unkey-local/`.
