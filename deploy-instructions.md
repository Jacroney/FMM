# Deploy to Vercel with Security

## Method 1: Using Password Protection (Recommended)

1. **Install and login to Vercel**:
   ```bash
   npm i -g vercel
   vercel login
   ```

2. **Deploy**:
   ```bash
   cd /Users/joe/Desktop/Projects/FMM
   vercel --prod
   ```

3. **Set environment variables in Vercel dashboard**:
   - Go to project settings
   - Environment Variables section
   - Add:
     - `VITE_APP_PASSWORD` = `FMM-KSIG-2025-Secure!`
     - `VITE_SUPABASE_URL` = (your Supabase URL)
     - `VITE_SUPABASE_ANON_KEY` = (your Supabase anon key)

4. **Redeploy after setting env vars**:
   ```bash
   vercel --prod
   ```

## Method 2: Using HTTP Basic Auth
- Use the middleware.js file for browser-level authentication
- Username: `admin`
- Password: `FMM-KSIG-2025!`

## Custom Domain Setup

1. **In Vercel dashboard**:
   - Go to project settings
   - Domains section
   - Add your custom domain

2. **DNS Setup**:
   - Point your domain to Vercel's servers
   - Vercel will provide the DNS records

## Access Password
Once deployed, users will need to enter: `FMM-KSIG-2025-Secure!`

## Security Notes
- Password is stored in environment variables
- Authentication persists in localStorage
- Logout button available in top-right
- Change the password in the environment variable as needed