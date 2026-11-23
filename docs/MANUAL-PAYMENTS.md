# Manual (UPI + WhatsApp) membership payments: your routine
1. Run `npm run setup-env -- WHATSAPP_NUMBER=91XXXXXXXXXX UPI_ID=yourname@bank UPI_NAME=ROOVO` on your computer (and add the same values in Vercel for the live site). WHATSAPP_NUMBER: country code + digits only.
2. A provider registers (or opens Plan), picks a paid plan, ticks the consent box. WhatsApp opens with a typed message that includes a reference like ROOVO-3F9A1C. You also get an in-app notification (and an email if Resend is set).
3. Open Admin > Plan payments. The request shows with a ready QR (amount + reference pre-filled). Screenshot it, tap "Message on WhatsApp", attach the QR and send.
4. When the provider pays and sends the UTR, CHECK YOUR BANK / UPI APP for the credit (amount, UTR). Screenshots can be faked. Then type the UTR and click "Payment received: activate". The plan switches on for 30 days and the provider gets a notification and a receipt.
5. Verify the business documents in Admin > Providers (separate step).
6. Renewals: the "Active memberships" table shows days left; use "Send reminder" or "Give a plan directly".
Tips: use a business account/UPI ID, keep records for your CA, and decide whether to keep the free trial (trial_days). To switch the trial off: run in Supabase SQL: update platform_settings set value = '0' where key = 'trial_days';
