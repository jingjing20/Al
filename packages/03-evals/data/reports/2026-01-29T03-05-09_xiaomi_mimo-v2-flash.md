# Evaluation Report

## Summary

| Metric | Value |
|--------|-------|
| **Model** | xiaomi/mimo-v2-flash |
| **Run Time** | 2026-01-29T03:05:09.388Z |
| **Total Cases** | 10 |
| **Passed** | 9 (90.0%) ✅ |
| **Failed** | 1 |
| **Average Score** | 4.10 / 5 |
| **Average Latency** | 1162ms |

## Worst Cases (Score <= 2)

| Case ID | Score | Reason |
|---------|-------|--------|
| hard-implicit-02 | 2/5 | The output incorrectly lists 'Coinbase' as the current company despite the user stating they are 'currently between jobs', and fails to reflect the unemployment status in the company field. |

## All Results

| Case ID | Score | Latency | Reason |
|---------|-------|---------|--------|
| hard-inference-01 | 5/5 ✅ | 983ms | The output accurately extracted the name 'Alex Rivera', identified the current company as his own venture, calculated the correct years of experience (9), and assigned an appropriate title ('Founder'). |
| hard-inference-02 | 3/5 ⚠️ | 696ms | The name and company were extracted correctly, but the years field was null despite the input providing enough information to calculate it, and the title was not fully normalized. |
| hard-contradiction-01 | 5/5 ✅ | 811ms | The output accurately extracts all four key points: name 'Jennifer', current company 'Anthropic' (correctly ignoring the initial Google mention), title 'Research Scientist', and years of experience '4'. The JSON structure is clean and well-organized. |
| hard-contradiction-02 | 5/5 ✅ | 752ms | The output accurately extracts all four key points: name 'Tom', official title 'Cloud Infrastructure Engineer', company 'AWS', and years of experience as 12 (which is an acceptable interpretation of the user's clarification). |
| hard-noisy-01 | 5/5 ✅ | 777ms | The AI output accurately extracted all five expected key points (name, title, company, and years) and presented them in a clean, structured JSON format. It correctly identified 'Maria Santos' as the subject, ignoring the sender and Sarah. |
| hard-noisy-02 | 4/5 ✅ | 972ms | The output correctly extracted the name (including the apostrophe) and title, but the company field includes 'Inc.' which is not in the expected value, and the years are rounded down to 4 instead of the expected 4-5 range. |
| hard-implicit-01 | 5/5 ✅ | 1047ms | The output accurately captures all four key points: the name 'Chris', the current title 'senior engineer' (matching the expected case-insensitive requirement), the company 'Spotify', and the correct total years of experience (5). |
| hard-implicit-02 | 2/5 ❌ | 749ms | The output incorrectly lists 'Coinbase' as the current company despite the user stating they are 'currently between jobs', and fails to reflect the unemployment status in the company field. |
| hard-math-01 | 3/5 ⚠️ | 4091ms | The name and company were extracted correctly, but the years of experience is inaccurate (8 vs expected 7), likely due to including the 2-year travel gap. |
| hard-math-02 | 4/5 ✅ | 741ms | The name, title, and company are extracted correctly, but the 'years' value of 8 is slightly inaccurate compared to the expected 6 years of professional experience (postdoc + professor). |
