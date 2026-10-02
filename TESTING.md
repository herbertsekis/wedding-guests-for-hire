# Required acceptance run

Use no seed records. Clear only practice records before starting S01.

1. In Telegram, start the bot; as Svetlana link your user ID to Richard, submit S01, relink it to Kevin, then submit E01. Confirm each record saves, gets a confirmation, and preserves its submitting employee and original chat ID.
2. Use the demonstration roles to enter all remaining Test 1 rows. Before decisions: two pending sales, E01/E02 awaiting allocation, E03 overhead, zero approved income/commission, project results zero, company result -300.
3. As Svetlana execute the Test 1 decisions. Verify dashboard totals: A 700, B 1800, company 2400; commissions Richard 90, Anastasia 110, Jean-Claude 100. Confirm actual Sheets rows were updated in place and refresh the page.
4. Enter Test 2 as the required demonstration roles, link Jean-Claude then Kevin to your private chat, and execute only the listed decisions. Verify A 2050, B 2180, company 3930; commissions 140/175/215. S05 remains pending and E07 awaiting allocation.
5. Prove enforcement: invalid 60/30/20 split, Kevin sale, Richard approval, zero expense, duplicate reference, and second approval all fail without changing totals.
6. To exercise retry, temporarily remove the Sheets credential, submit a valid record, restore it, and use **Retry Sheets sync**. The same reference must update its original row and totals must not change. Temporarily make the bot token invalid before a decision; it must show notification failed, then succeed only after **Retry notification**.
