# One-time: create the GitHub repository

The local repo is ready (`git` initialized, `origin` points here). GitHub does not have the remote yet until you create it.

1. Open **https://github.com/new**
2. **Repository name:** `shottrack` (or another name — if you change it, run  
   `git remote set-url origin https://github.com/apanner/YOUR_NAME.git` inside this folder.)
3. Leave **empty** (no README, no .gitignore).
4. Create the repository.
5. In this directory run:

```bash
git push -u origin main
```

Sign in if prompted (GitHub CLI, browser, or credential manager).

After that, the code is at **https://github.com/apanner/shottrack** (if you used that name).
