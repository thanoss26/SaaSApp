# Invite Code Setup Guide

## Database Schema Setup

To enable invite code functionality, you need to run the SQL schema in your Supabase database.

### Option 1: Run via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `database/add_invite_code.sql`
4. Execute the SQL

### Option 2: Run via Supabase CLI

```bash
supabase db push
```

## What the Schema Adds

The invite code schema adds the following to your `employees` table:

- `invite_code` (VARCHAR(10)) - Unique 8-character alphanumeric code
- `invite_code_generated_at` (TIMESTAMP) - When the code was generated
- `invite_code_expires_at` (TIMESTAMP) - When the code expires (7 days)
- `invite_sent_at` (TIMESTAMP) - When the invite was sent
- `invite_sent_by` (UUID) - Who sent the invite

## Functions Created

- `generate_invite_code()` - Generates unique invite codes
- `regenerate_invite_code(employee_uuid)` - Regenerates code for an employee
- `mark_invite_sent(employee_uuid, sent_by_uuid)` - Marks invite as sent
- `validate_invite_code(code)` - Validates invite codes

## Features Added

### Frontend
- New "Invite Code" column in the employees table
- Display of invite codes with status (Pending/Registered)
- Buttons to regenerate and send invites
- Modal showing invite details after sending

### Backend API Endpoints
- `POST /api/users/:id/regenerate-invite` - Regenerate invite code
- `POST /api/users/:id/send-invite` - Send invite email
- `POST /api/users/validate-invite` - Validate invite code

## How It Works

1. **Automatic Generation**: When a new employee is created, an invite code is automatically generated
2. **Display**: The invite code is shown next to the email in the employees table
3. **Status**: Shows whether the employee has registered (green checkmark) or is pending (orange clock)
4. **Actions**: 
   - Regenerate button (🔄) - Creates a new invite code
   - Send button (📧) - Marks invite as sent and shows details
5. **Validation**: Invite codes can be validated for employee registration

## Email Integration

Currently, the system shows the invite details in a modal. To integrate with actual email sending:

1. Add an email service (SendGrid, AWS SES, etc.)
2. Update the `send-invite` endpoint to send actual emails
3. Include the invite code in the email template

## Security Features

- Invite codes expire after 7 days
- Codes are unique and randomly generated
- Only organization admins can manage invite codes
- Codes are validated before allowing registration

## Testing

After running the schema:

1. Go to the Users page
2. You should see invite codes next to employee emails
3. Try regenerating and sending invites
4. Check that the status updates correctly 