# Evaluation Report

## Summary

| Metric | Value |
|--------|-------|
| **Model** | xiaomi/mimo-v2-flash |
| **Run Time** | 2026-01-29T08:44:11.689Z |
| **Total Cases** | 10 |
| **Passed** | 6 (60.0%) ⚠️ |
| **Failed** | 4 |
| **Average Score** | 3.50 / 5 |
| **Average Latency** | 939ms |

## Worst Cases (Score <= 2)

| Case ID | Score | Reason |
|---------|-------|--------|
| hard-inference-01 | 2/5 | The 'name' and 'years' fields are correct, but the 'company' field is wrong as it repeats the name instead of identifying the new venture, and 'title' is acceptable but lacks context due to the company error. |
| hard-contradiction-02 | 2/5 | The output correctly extracted the name, company, and years, but it failed to use the official title 'Cloud Infrastructure Engineer' instead of the casual 'Senior DevOps'. |
| hard-implicit-02 | 2/5 | The output incorrectly lists 'Coinbase' as the current company despite the user stating they are 'currently between jobs', violating the requirement for the company to be null or 'Unemployed'. While the name and years are correct, the title is ambiguous as it doesn't reflect the current unemployed status. |
| hard-math-01 | 2/5 | The name and company are correct, but the 'years' value is 5 instead of the expected 7, which is a significant error in the context of the task. |

## All Results

| Case ID | Score | Latency | Reason |
|---------|-------|---------|--------|
| hard-inference-01 | 2/5 ❌ | 1058ms | The 'name' and 'years' fields are correct, but the 'company' field is wrong as it repeats the name instead of identifying the new venture, and 'title' is acceptable but lacks context due to the company error. |
| hard-inference-02 | 3/5 ⚠️ | 798ms | The output correctly extracted the name 'David Kim' and company 'Netflix', and the title relates to 'infrastructure' and 'lead', but it failed to calculate the years of experience (should be around 17-18 based on the iPhone release in 2007). |
| hard-contradiction-01 | 5/5 ✅ | 993ms | The output correctly extracts all four key points: name, current company (Anthropic), title, and years of experience, matching the user's corrected statement exactly. |
| hard-contradiction-02 | 2/5 ❌ | 1040ms | The output correctly extracted the name, company, and years, but it failed to use the official title 'Cloud Infrastructure Engineer' instead of the casual 'Senior DevOps'. |
| hard-noisy-01 | 5/5 ✅ | 870ms | The output accurately extracted all five expected key points (name, title, company, years) and presented them in a clean, structured JSON format. It correctly identified 'Maria Santos' as the subject despite the message containing multiple names and context. |
| hard-noisy-02 | 4/5 ✅ | 1061ms | The output correctly extracted the name (including the apostrophe) and title, but the company field includes 'Inc.' which is not in the expected value, and the years are listed as an integer (4) rather than a range (4-5) as requested. |
| hard-implicit-01 | 5/5 ✅ | 993ms | The output accurately extracts all four expected key points: name, title, company, and the calculated years of experience. The JSON structure is clean and directly matches the required format. |
| hard-implicit-02 | 2/5 ❌ | 905ms | The output incorrectly lists 'Coinbase' as the current company despite the user stating they are 'currently between jobs', violating the requirement for the company to be null or 'Unemployed'. While the name and years are correct, the title is ambiguous as it doesn't reflect the current unemployed status. |
| hard-math-01 | 2/5 ❌ | 786ms | The name and company are correct, but the 'years' value is 5 instead of the expected 7, which is a significant error in the context of the task. |
| hard-math-02 | 5/5 ✅ | 882ms | The output correctly identifies the name, title, and company, and accurately calculates the 6 years of professional experience by excluding the PhD duration as requested. |
