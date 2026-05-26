# Citation liveness — 2026-05-26

Script: `scripts/verify-doi-liveness.mjs` · Source: `src/data/references.json` (31 entries)

| Verdict | Count |
|---------|-------|
| ✅ pass | 17 |
| 🟡 manual review (publisher blocks bot / timeout) | 14 |
| 🔴 fail (4xx / 5xx / network) | 0 |

## Pass

- `aly-2021` — 206 — https://transfemscience.org/articles/injectable-e2-meta-analysis/
- `canonico-2018` — 200 — https://doi.org/10.1016/j.maturitas.2015.06.040
- `coleman-2022` — 200 — https://doi.org/10.1080/26895269.2022.2100644
- `deblok-2021` — 200 — https://doi.org/10.1016/S2213-8587(21)00185-6
- `ema-2020` — 206 — https://www.ema.europa.eu/en/news/restrictions-use-cyproterone-due-meningioma-risk
- `fuji-2023` — 200 — https://www.pmda.go.jp/PmdaSearch/rdSearch/02/2473402A2059
- `herndon-2023` — 200 — https://doi.org/10.1016/j.eprac.2023.02.006
- `gerber-2024` — 200 — https://pmc.ncbi.nlm.nih.gov/articles/PMC11416909/
- `hudelist-2026` — 200 — https://doi.org/10.1016/j.eclinm.2026.103791
- `lee-2022` — 200 — https://doi.org/10.1038/s41598-022-05773-z
- `misakian-2025` — 200 — https://doi.org/10.1016/j.eprac.2025.07.002
- `oriowo-1980` — 200 — https://doi.org/10.1016/S0010-7824(80)80018-7
- `price-1997` — 200 — https://doi.org/10.1016/S0029-7844(96)00513-3
- `neyman-2019` — 200 — https://doi.org/10.1016/j.jadohealth.2018.10.296
- `fuqua-2024` — 200 — https://doi.org/10.1016/j.jadohealth.2024.06.028
- `angus-2024` — 200 — https://pubmed.ncbi.nlm.nih.gov/39691186/
- `wilde-2024` — 200 — https://pubmed.ncbi.nlm.nih.gov/37791922/

## Manual review

These returned 403 / 405 / 429 / timeout — common for Crossref + several publishers when accessed by bots. A human should open the URL in a browser and confirm the paper still resolves.

- `hembree-2017` — 403 — https://doi.org/10.1210/jc.2017-01658 _(publisher blocks bot; verify manually)_
- `howlow-2024` — 403 — https://doi.org/10.1080/26895269.2024.2317395 _(publisher blocks bot; verify manually)_
- `kanin-2025` — 403 — https://doi.org/10.1210/jendso/bvaf004 _(publisher blocks bot; verify manually)_
- `kuhl-2005` — 403 — https://doi.org/10.1080/13697130500148875 _(publisher blocks bot; verify manually)_
- `meyer-2020` — 403 — https://doi.org/10.1530/EJE-19-0463 _(publisher blocks bot; verify manually)_
- `patel-2021` — 403 — https://doi.org/10.1089/trgh.2020.0057 _(publisher blocks bot; verify manually)_
- `poage-2026` — 403 — https://doi.org/10.3390/pharmacy14010013 _(publisher blocks bot; verify manually)_
- `prior-2019` — 403 — https://doi.org/10.1210/jc.2018-01777 _(publisher blocks bot; verify manually)_
- `rothman-2024` — 403 — https://doi.org/10.1089/trgh.2023.0209 _(publisher blocks bot; verify manually)_
- `ucsf-2016` — 403 — https://transcare.ucsf.edu/guidelines _(publisher blocks bot; verify manually)_
- `matsumoto-2020` — 403 — https://doi.org/10.1177/2050312120918264 _(publisher blocks bot; verify manually)_
- `vinogradova-2019` — 503 — https://doi.org/10.1136/bmj.k4810 _(5xx after retry; likely transient publisher CDN — verify manually)_
- `hou-2026` — 403 — https://doi.org/10.1001/jamanetworkopen.2025.52440 _(publisher blocks bot; verify manually)_
- `liu-2020` — 403 — https://doi.org/10.1016/j.jsxm.2020.07.081 _(publisher blocks bot; verify manually)_
