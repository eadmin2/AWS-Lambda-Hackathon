# GDPR Data Inventory for VA Rating Assistant

| Data Type                | Source (How/Where)         | Purpose                        | Storage Location / Table         | Access (Who)         | Third Parties         | Retention / Deletion Policy         | Special Category?         |
|--------------------------|----------------------------|--------------------------------|----------------------------------|----------------------|-----------------------|-------------------------------------|---------------------------|
| User ID (UUID)           | Signup/Auth                | User identification            | `auth.users`, `profiles`         | User, Admin          | -                     | Until account deletion              | No                        |
| Email Address            | Signup/Auth                | Login, notifications           | `auth.users`, `profiles`         | User, Admin          | Email provider        | Until account deletion              | No                        |
| Full Name                | Profile                    | Personalization                | `profiles`                       | User, Admin          | -                     | Until account deletion              | No                        |
| Phone Number             | Stripe Checkout            | Billing, contact               | Stripe (external)                | Admin                | Stripe                | Stripe policy                       | No                        |
| Address                  | Stripe Checkout            | Billing, contact               | Stripe (external)                | Admin                | Stripe                | Stripe policy                       | No                        |
| Role/Admin Level         | Profile/Admin              | Access control                 | `profiles`                       | Admin                | -                     | Until account deletion              | No                        |
| Uploaded Documents       | File Upload                | Service usage                  | `documents`, Supabase Storage (S3, encrypted) | User, Admin          | Supabase S3           | User/admin deletes, or on request   | Yes (health records)      |
| Document Metadata        | File Upload                | Service usage                  | `documents`                      | User, Admin          | -                     | User/admin deletes, or on request   | Yes (health records)      |
| Disability Estimates     | User Input                 | Service feature                | `disability_estimates`           | User, Admin          | -                     | User/admin deletes, or on request   | Yes (health-related)      |
| Payment Info (IDs only)  | Checkout                   | Billing                        | `payments`, `stripe_customers`   | Admin                | Stripe                | Stripe policy                       | No                        |
| Subscription Status      | Stripe Webhook/Checkout    | Billing                        | `payments`, `stripe_subscriptions`| Admin, User          | Stripe                | Stripe policy                       | No                        |
| Order History            | Stripe Checkout            | Billing                        | `stripe_orders`                  | Admin, User          | Stripe                | Stripe policy                       | No                        |
| Admin Activity Log       | Admin Actions              | Security/audit                 | `admin_activity_log`             | Admin                | -                     | Retained for audit, per policy      | No                        |
| Notification Data        | System/Events              | Alerts                         | (likely in app, not DB)          | Admin                | -                     | Until dismissed/expired             | No                        |
| Analytics/Tracking       | Frontend                   | Product improvement            | (external, e.g., analytics tool) | Admin                | Analytics provider    | Per provider policy                 | No                        |
| Support Tickets (planned)| User Input/Support         | Customer support               | (planned: support_tickets table) | User, Admin, Support | (TBD)                 | Until resolved/user request         | Maybe (if health info)    |

**Notes:**
- Uploaded documents (including health records) are encrypted in Supabase S3 storage and can be deleted by users at any time.
- Health records are only accessed for service purposes and are not sold or shared with any third parties.
- Stripe stores phone and address for billing; this data is not stored in Supabase unless explicitly collected.
- Support ticket system is planned; if health info is included, it will be treated as special category data.
- Third-party services: Stripe (payments, billing info), Supabase (database, storage), Supabase S3 (encrypted document storage), analytics provider (if used). 