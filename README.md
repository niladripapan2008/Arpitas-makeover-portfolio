# Arpita’s Makeover (React + Vercel + Upstash Redis + Vercel Blob)

1. Push this folder to GitHub and import it in Vercel (framework: Vite).
2. In the Vercel project, add **Upstash Redis** and a **Blob** store from Storage / Marketplace and connect both.
3. Add environment variables:
   - `OWNER_PASSCODE_HASH` = the encrypted passcode (scrypt hash). Create one with `node scripts/hash-passcode.mjs "new passcode"`.
   - `SESSION_SECRET` = any long random text.
4. Redeploy.

Owner mode: type `/#owner` after the site address (for example `https://yoursite.vercel.app/#owner`), enter the passcode, edit, then press **Publish changes**.
Nothing on the public pages links to owner mode. Never put the plain passcode in a file or in GitHub.
