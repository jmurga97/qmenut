# Explicit retranslation of a branch

Menu edits do not trigger translations or track stale text. Operators add a language,
then explicitly retranslate every editable menu string of the selected branch for that
language, accepting that existing translations are overwritten. Removing a language
also removes its translations; Spanish remains the default source language.

This replaces the manual editor, coverage counters, visibility toggles, source hashes
and pending/provenance fields. Missing translations use the source text until the next
explicit retranslation. Ingredients remain shared restaurant entities, so their translated
names are shared by every branch using them. Successful provider batches are retained
on failure and public caches are invalidated so that partial progress is visible.
