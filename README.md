# Mycelium

Map the people you know as a living network, see where it is strong or fragile, and find warm introductions through friends.

Built for the Learning Planet Institute club, from an idea by Michael Bäcklund.

## What's in v0

- **My map**: an interactive constellation of your network, with you at the centre. Closer ties sit nearer.
- **Four ways to add people**: one at a time, a whole group at once, describing people in your own words (Gemini extracts names, circles and who knows whom), or importing a CSV (Mycelium template, LinkedIn `Connections.csv`, or any sheet with a name column). Download your map as CSV any time.
- **Network health**: people who hold a group together (single points of failure), brokers between circles, people who know nobody else in your map, fading close ties, over-reliance on one circle, fields where you know only one person, and suggested introductions between your own friends.
- **Club reach**: everyone's maps woven together, shown blind (roles, organizations, places and interests, never names, notes or emails). Merges people several members know, shows how many people you're 2 or 3 steps from, field coverage and blind spots, and a "Who are you trying to reach?" search with the warmest path.
- **Intros**: ask the member who knows someone for an introduction. They see your note, decide, and reply. Names are never revealed by the app.
- **Access**: `@learningplanetinstitute.org` accounts can sign in; admins invite guests from other domains on the Access page.

People marked "Keep out of club reach" never appear in the club view.

## Stack

Next.js 16 (App Router), NextAuth (Google), MongoDB Atlas, Gemini API, react-force-graph, Tailwind.

## Run locally

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev
```

## Deploy on Vercel

1. Import this repo in Vercel (framework: Next.js, defaults are fine).
2. Add every variable from `.env.example` in Project Settings > Environment Variables. Set `NEXTAUTH_URL` to the deployed URL.
3. In Google Cloud, add `https://<your-domain>/api/auth/callback/google` as an authorized redirect URI on the OAuth client.
4. In MongoDB Atlas, make sure Network Access allows Vercel (0.0.0.0/0 on the free tier).

## CSV template

| name | circle | field | role | org | city | country | tags | closeness | last_contact | email | notes | knows |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

`tags` and `knows` are separated by semicolons. `closeness` is 1 (met once or twice) to 5 (inner circle). `last_contact` is `YYYY-MM-DD`.
