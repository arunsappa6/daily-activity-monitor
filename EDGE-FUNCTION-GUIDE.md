# Edge Function Guide — Group Join Request Emails

This guide explains how to enable real email notifications when an admin
accepts or denies a group join request (items 21 and 22 in the enhancement list).

---

## Why an Edge Function is needed

Browsers cannot send emails directly. When an admin clicks Accept or Deny,
the status is saved in the database immediately. To also send an email to the
requester, you need server-side code — Supabase Edge Functions handle this.

---

## Step 1 — Create the Edge Function in Supabase

1. Go to **Supabase Dashboard → Edge Functions → Deploy new function**
2. Name it: `send-group-email`
3. Paste this code:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') // set in Step 3

serve(async (req) => {
  const { email, first_name, group_name, status } = await req.json()

  const isAccepted = status === 'accepted'

  const subject = isAccepted
    ? `Welcome to ${group_name}!`
    : `Your request to join ${group_name}`

  const html = isAccepted
    ? `<p>Hi ${first_name},</p>
       <p>Great news! Your request to join <strong>${group_name}</strong> has been <strong>accepted</strong>.</p>
       <p>You can now view the group schedule in Daily Activity Monitor.</p>
       <p>Welcome to the group! 🎉</p>`
    : `<p>Hi ${first_name},</p>
       <p>Unfortunately, your request to join <strong>${group_name}</strong> has been <strong>declined</strong> by the group admin.</p>
       <p>You are welcome to request to join other groups.</p>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Daily Activity Monitor <noreply@yourdomain.com>',
      to: [email],
      subject,
      html
    })
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    status: res.ok ? 200 : 400
  })
})
```

4. Click **Deploy**

---

## Step 2 — Get a free Resend API key

1. Go to **resend.com** and create a free account
2. Go to **API Keys → Create API Key**
3. Copy the key

---

## Step 3 — Add your Resend API key to Supabase

1. In Supabase go to **Edge Functions → send-group-email → Secrets**
2. Add secret: `RESEND_API_KEY` = your Resend key from Step 2

---

## Step 4 — Add the RPC wrapper in Supabase SQL Editor

Run this SQL so the frontend can trigger the Edge Function:

```sql
create or replace function public.notify_request_decision(
  p_email      text,
  p_first_name text,
  p_group_name text,
  p_status     text
)
returns void as $$
declare
  edge_url text;
begin
  edge_url := current_setting('app.settings.supabase_url') || '/functions/v1/send-group-email';
  perform net.http_post(
    url    := edge_url,
    body   := json_build_object(
      'email',      p_email,
      'first_name', p_first_name,
      'group_name', p_group_name,
      'status',     p_status
    )::text,
    headers := json_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  );
end;
$$ language plpgsql security definer;
```

---

## Free tier limits (Resend)

- 3,000 emails/month free
- 100 emails/day free
- No credit card required

This is more than sufficient for 20,000 users where only a fraction
will be sending join requests on any given day.

---

## Testing

1. Register two accounts — make one an admin (create a group)
2. From the second account, submit a join request
3. From the admin account, click Accept or Deny
4. Check the second account's inbox for the notification email
