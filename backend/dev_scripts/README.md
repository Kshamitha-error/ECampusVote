# Dev scripts

These are one-off scripts used during development/debugging (fixing admin
accounts, checking student records, patching image URLs, seeding test
students). They are **not** part of the running app — `app.py` never imports
anything from this folder.

Run them manually only if you need to, e.g.:

```
cd backend
python dev_scripts/fix_admin.py
```

They're kept here (instead of deleted) in case you need them again, but kept
out of the main backend folder so it's clear they aren't part of the actual
application.
