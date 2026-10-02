# Wedding Guests for Hire

Friends Included Ltd finance system. Supabase is the source of truth; the website and Telegram bot both call the same server-side processing functions. Google Sheets is a readable, one-way copy.

## Local setup

1. Create a Supabase project. In the SQL editor, run `supabase/migrations/001_initial.sql`.
2. Copy `.env.example` to `.env.local` and add values locally. Do not commit it.
3. Create a Google Sheet with tabs exactly named `Sales` and `Expenses`; share it as **Editor** with the service-account email in your JSON, then set its ID and JSON environment variables.
4. `npm install`, `npm run dev`, then select a fictional employee under **Demonstration role**.

## Telegram setup

Create a bot with BotFather, add the token locally, and set its webhook to `https://YOUR-VERCEL-DOMAIN/api/telegram` with `secret_token` equal to `TELEGRAM_WEBHOOK_SECRET`. Each employee must first press Start in a private chat. Svetlana links the Telegram numeric user ID to a fictional employee in Manager setup. The bot accepts:

```
/sale S01 | Olivia Rose | A | One proud uncle | 1000 | 50 | 30 | 20
/expense E01 | Rented suit | Materials | 120 | A
```

## Deploy

Push this new directory to a new GitHub repository, import it into Vercel, add the same environment variables in Vercel, then set the Telegram webhook to the deployed URL. The page identifies Herberts Ēķis as the implementation owner.

## Verification checklist

Run the document's Test 1 and Test 2 records through the interfaces—not seed data. Confirm totals, refresh persistence, denied actions, reference duplicates, the original S01/E01 Telegram notification chat after relinking, a Sheets retry, and a failed Telegram notification retry. See `TESTING.md`.
