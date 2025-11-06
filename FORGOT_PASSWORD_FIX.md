# FIX: Forgot Password / Reset Password Feature

## Masalah
Reset password link selalu error dengan "link expired" atau "access denied" meskipun link baru dan dibuka di browser yang sama.

## Root Cause
Supabase menggunakan PKCE (Proof Key for Code Exchange) flow secara default yang sangat strict dan sering bermasalah.

## Solusi

### STEP 1: Configure Supabase Auth Settings

Buka **Supabase Dashboard** → **Authentication** → **URL Configuration**

Set the following:

1. **Site URL:** `http://localhost:3000` (atau domain production)
2. **Redirect URLs:** Tambahkan:
   ```
   http://localhost:3000/reset-password
   http://localhost:3000/auth/reset-password
   http://localhost:3000/**
   ```

### STEP 2: Disable PKCE (Recommended untuk Development)

Buka **Supabase Dashboard** → **Authentication** → **Settings**

Cari section **"PKCE Flow"** atau **"Password Recovery"** settings:
- Set PKCE to **DISABLED** atau
- Enable **"Allow recovery token in URL"**

### STEP 3: Email Template Configuration

Buka **Supabase Dashboard** → **Authentication** → **Email Templates**

Edit **"Reset Password"** template, pastikan URL menggunakan:

**Option A - Hash-based (Recommended):**
```html
<a href="{{ .SiteURL }}/reset-password?token={{ .Token }}&type=recovery">Reset Password</a>
```

**Option B - Legacy (Most Compatible):**
```html
<a href="{{ .SiteURL }}/reset-password#access_token={{ .Token }}&type=recovery">Reset Password</a>
```

### STEP 4: Code Changes (Already Applied)

✅ `app/forgot-password/page.tsx` - Redirect ke `/reset-password`
✅ `app/reset-password/page.tsx` - Simplified session handling dengan retry mechanism

## Testing

1. Request password reset dari `/forgot-password`
2. Check email dan klik link
3. Seharusnya redirect ke `/reset-password` dan bisa input password baru
4. Submit → Success → Redirect ke `/login`

## Troubleshooting

### Link masih error?
- Clear browser cookies/cache
- Pastikan Supabase settings sudah diupdate
- Coba incognito/private window
- Check Supabase logs di Dashboard

### Session tidak terdeteksi?
- Increase retry attempts di code (currently 8 attempts)
- Check browser console untuk error messages
- Verify Supabase anon key correct di `.env.local`

## Alternative: Direct Password Update (Admin Only)

Jika reset password benar-benar tidak work, admin bisa update password directly via SQL:

```sql
-- Update password for specific user (hash will be auto-generated)
-- Replace 'user@example.com' with actual email
-- Replace 'newpassword123' with desired password

UPDATE auth.users
SET encrypted_password = crypt('newpassword123', gen_salt('bf'))
WHERE email = 'user@example.com';
```

**⚠️ WARNING:** This should only be used as last resort in development!
