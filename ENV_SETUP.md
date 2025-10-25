# Environment Variables Setup

## Problem
When deployed to Vercel, your frontend is trying to make API calls to `https://hms-opd-frontend-rq5u.vercel.app/api/auth/login`, which doesn't exist. You need to:

1. Deploy your backend separately
2. Configure your frontend to point to the deployed backend

## Quick Fix for Vercel

### Step 1: Add Environment Variable in Vercel

1. Go to https://vercel.com/dashboard
2. Click on your project: `hms-opd-frontend`
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://YOUR-BACKEND-URL/api` (you'll get this after deploying backend)
   - **Environment:** Production, Preview, Development
5. Click **Save**
6. Go to **Deployments** tab and **Redeploy** your frontend

### Step 2: Deploy Backend

You need to deploy the backend separately. Here are the easiest options:

#### Option A: Deploy Backend to Railway (Recommended)

1. Go to https://railway.app
2. Sign up with GitHub
3. Click **New Project** → **Deploy from GitHub repo**
4. Select your repository
5. Set **Root Directory** to `backend`
6. Add environment variables in Railway:
   - `MONGODB_URI` - Your MongoDB connection string
   - `JWT_SECRET` - Any random string (e.g., `your-secret-key-123`)
   - `PORT` - `7000` or leave empty (Railway sets it automatically)
7. Click **Deploy**
8. Once deployed, copy the URL (e.g., `https://hms-opd-backend.railway.app`)
9. Go back to Vercel and update `VITE_API_BASE_URL` to: `https://hms-opd-backend.railway.app/api`
10. Redeploy frontend

#### Option B: Deploy Backend to Render

1. Go to https://render.com
2. Sign up with GitHub
3. Click **New +** → **Web Service**
4. Connect your GitHub repository
5. Configure:
   - **Name:** `hms-opd-backend`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Add environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `PORT` (or leave empty)
7. Click **Create Web Service**
8. Copy the URL (e.g., `https://hms-opd-backend.onrender.com`)
9. Update `VITE_API_BASE_URL` in Vercel

#### Option C: Deploy Backend to Vercel

1. In Vercel dashboard, create a **NEW** project
2. Connect the same GitHub repository
3. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** Leave default
   - **Output Directory:** Leave default
4. Add environment variables in Vercel:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `PORT` (optional)
5. Deploy
6. Update `VITE_API_BASE_URL` in your frontend Vercel project

### Step 3: Update Frontend Environment Variable

After deploying backend, update `VITE_API_BASE_URL` in Vercel:
- Go to your frontend project on Vercel
- Settings → Environment Variables
- Update `VITE_API_BASE_URL` with your backend URL + `/api`
- Example: `https://hms-opd-backend.railway.app/api`
- Redeploy frontend

## For Local Development

Create a file named `.env.local` in the `frontend/` directory:

```env
VITE_API_BASE_URL=http://localhost:7000/api
```

This will be used when running `npm run dev` locally.

## Testing

After deployment:
1. Backend should be accessible at: `https://your-backend-url.com/api/health`
2. Frontend should make API calls to: `https://your-backend-url.com/api/auth/login`
3. Check browser console for any CORS errors (backend needs to allow your frontend domain)

## Important Notes

- Backend must allow CORS from your frontend domain
- MongoDB must be accessible from your deployed backend
- Make sure all environment variables are set correctly in both frontend and backend
- Redeploy frontend after changing `VITE_API_BASE_URL`
