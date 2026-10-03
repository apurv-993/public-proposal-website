# Lilac Proposal Website 💜 — Public-host setup

A responsive static website with Supabase-backed sharing. Visitors create their own proposal, upload up to six photos and an optional audio file, then share a unique URL. The recipient's browser loads the saved proposal and media from Supabase; the original creator does not need to keep their device online.

## Files

- `index.html` — all screens and form controls
- `style.css` — responsive lilac/plum styling
- `script.js` — proposal creation, uploads, media playback, sharing and replies
- `supabase-config.js` — public project URL and publishable/anon key placeholders
- `supabase-setup.sql` — database, access rules and public storage bucket setup

## 1. Create the Supabase backend

1. Create a project at https://supabase.com/.
2. Open **SQL Editor → New query**.
3. Paste the entire `supabase-setup.sql` file and run it.
4. Open **Project Settings → API** (or API Keys) and copy the Project URL and publishable key / legacy anon key.
5. Replace the placeholders in `supabase-config.js` with those two values.
6. Never put a service-role or secret key in this website. A publishable/anon key is intended for browser use only when RLS is configured.

The SQL disables direct table reads and exposes a single-row `get_proposal_by_id` function. The link contains a random UUID that acts as a bearer secret: anyone with that link can view that proposal. Do not put sensitive content in it.

## 2. Publish on GitHub Pages

1. Create a public GitHub repository, e.g. `lilac-proposal-website`.
2. Upload the contents of this folder to the repository root. `index.html` must be at the root beside the CSS, JS and config files.
3. Open **Settings → Pages**.
4. Choose **Deploy from a branch**, select `main` and `/(root)`, then save.
5. Wait for GitHub Pages to publish and open the generated URL.

## 3. Test the real cross-device flow

1. Open the published URL in a normal browser window.
2. Fill in names, description and message. Select one or more photos and optionally an audio file (up to 20 MB).
3. Click **Create the moment** and wait for upload/save confirmation.
4. Click **Copy unique proposal link**.
5. Open that link in a private/incognito window or on a second device.
6. Verify that names, text, photos and music appear. The recipient may need to tap Play because browsers often block autoplay.

## Limits and public-launch safety

- The current anonymous creation flow is a lightweight public demo. It does not include server-side rate limiting, CAPTCHA, abuse reporting, automatic expiry or deletion. A public URL alone does not stop bots from submitting records or uploading files. Add a Supabase Edge Function with rate limiting and CAPTCHA verification before advertising this at scale.
- Uploaded media is in a public bucket, so anyone who gets an asset URL can access that asset. Proposal UUIDs are hard to guess but are not authentication; anyone with a share link can view the proposal.
- The recipient reply is prepared for copying/sharing by the recipient. It is not saved or sent to the creator automatically.
- Music must be a browser-supported file and you must have permission to share it. Streaming service webpage URLs usually are not direct audio file URLs.
- Supabase quotas and free-plan limits can change. Monitor usage and set billing/usage alerts in your Supabase project.

## Local testing

Open the folder in VS Code and use Live Server or another local HTTP server. Cloud uploads require the Supabase project to be configured first. Avoid opening files with `file://` if your browser blocks module/network requests.
