# Evaluation Report

## Summary

| Metric | Value |
|--------|-------|
| **Model** | deepseek/deepseek-v3.2-exp |
| **Run Time** | 2026-01-29T03:08:08.620Z |
| **Total Cases** | 10 |
| **Passed** | 8 (80.0%) ✅ |
| **Failed** | 2 |
| **Average Score** | 3.90 / 5 |
| **Average Latency** | 2045ms |

## Worst Cases (Score <= 2)

| Case ID | Score | Reason |
|---------|-------|--------|
| hard-inference-01 | 1/5 | The output is completely incorrect; it extracted the name but failed to infer any other required information, returning null for all other fields. |
| hard-implicit-02 | 2/5 | The output correctly identifies the name and years, but it incorrectly sets the company to 'Coinbase' instead of null/Unemployed, and the title should be optional given the user is currently between jobs. |

## All Results

| Case ID | Score | Latency | Reason |
|---------|-------|---------|--------|
| hard-inference-01 | 1/5 ❌ | 1766ms | The output is completely incorrect; it extracted the name but failed to infer any other required information, returning null for all other fields. |
| hard-inference-02 | 5/5 ✅ | 1801ms | All expected key points are accurately captured: name is 'David Kim', company is 'Netflix', title relates to 'infrastructure' and 'lead', and years (17) correctly falls within the 17-18 range based on the iPhone's 2007 release. |
| hard-contradiction-01 | 5/5 ✅ | 2050ms | The output accurately captures all four expected key points: name, corrected company, title, and years of experience, and is well-structured. |
| hard-contradiction-02 | 4/5 ✅ | 1697ms | Extracted name, company, and years correctly, but the title includes the casual 'Senior DevOps' in addition to the required official title. |
| hard-noisy-01 | 5/5 ✅ | 2283ms | The output perfectly extracts all required information (name, title, company, years) accurately and matches the expected structure. |
| hard-noisy-02 | 4/5 ✅ | 1717ms | Extracted name, title, and years correctly, but the company field includes 'Inc.' where only 'Apple' was expected. |
| hard-implicit-01 | 5/5 ✅ | 1879ms | All four key points are accurately captured: name is 'Chris', title is 'senior engineer' (case-insensitive match), company is 'Spotify', and total years are correctly calculated as 5. |
| hard-implicit-02 | 2/5 ❌ | 2048ms | The output correctly identifies the name and years, but it incorrectly sets the company to 'Coinbase' instead of null/Unemployed, and the title should be optional given the user is currently between jobs. |
| hard-math-01 | 3/5 ⚠️ | 3075ms | Extracted name and current company correctly, but the years of experience (9) is incorrect; it should be 7 (3+4, excluding travel gap). |
| hard-math-02 | 5/5 ✅ | 2131ms | All expected key points are accurately covered: name, title, company, and years of professional experience (postdoc + professor) are correctly extracted and structured. |
