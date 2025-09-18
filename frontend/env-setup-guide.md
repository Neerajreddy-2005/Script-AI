# 🔐 Environment Variables Setup Guide

## 📁 Create Your .env File

### Step 1: Create the .env file
In your `frontend` directory, create a file named `.env.local`:

```bash
# In the frontend directory
touch .env.local
```

### Step 2: Add Your Configuration
Copy the contents from `env.example` and update with your actual values:

```env
# n8n Webhook Configuration
VITE_N8N_WEBHOOK_URL=https://your-actual-n8n-instance.n8n.cloud/webhook/generate-content

# OpenAI Configuration (if needed for direct integration)
VITE_OPENAI_API_KEY=your_openai_api_key_here

# App Configuration
VITE_APP_NAME=Script AI
VITE_APP_VERSION=1.0.0
```

### Step 3: Replace with Your Actual Values
- **Replace** `https://your-actual-n8n-instance.n8n.cloud/webhook/generate-content` with your real n8n webhook URL
- **Replace** `your_openai_api_key_here` with your OpenAI API key (if needed)

## 🚀 How It Works

### Environment Variable Loading
- The app automatically loads `VITE_N8N_WEBHOOK_URL` from your `.env.local` file
- If the environment variable exists, the webhook URL input becomes **disabled** and shows a green indicator
- If no environment variable is set, you can manually enter the webhook URL

### Security Benefits
- ✅ **Webhook URL is hidden** from the source code
- ✅ **No sensitive data** in version control
- ✅ **Easy configuration** for different environments
- ✅ **Production-ready** setup

## 🔄 Development vs Production

### Development (.env.local)
```env
VITE_N8N_WEBHOOK_URL=https://your-dev-n8n.n8n.cloud/webhook/generate-content
```

### Production (.env.production)
```env
VITE_N8N_WEBHOOK_URL=https://your-prod-n8n.n8n.cloud/webhook/generate-content
```

## 📋 File Structure
```
frontend/
├── .env.local          # Your local environment variables (not in git)
├── .env.example        # Example file (safe to commit)
├── env.example         # Another example file
└── src/
    └── pages/
        └── DashboardPage.tsx
```

## 🛡️ Security Notes

### ✅ Do This
- Add `.env.local` to your `.gitignore` file
- Use different webhook URLs for dev/staging/production
- Keep your `.env.local` file private

### ❌ Don't Do This
- Don't commit `.env.local` to version control
- Don't share your `.env.local` file
- Don't put sensitive data in `.env.example`

## 🧪 Testing

### With Environment Variables
1. Create `.env.local` with your webhook URL
2. Restart your development server: `npm run dev`
3. The webhook URL input will be **disabled** and show "From .env"
4. Test your content generation

### Without Environment Variables
1. Don't create `.env.local` file
2. The webhook URL input will be **enabled**
3. Manually paste your webhook URL
4. Test your content generation

## 🔧 Troubleshooting

### Environment Variable Not Loading
- Make sure the file is named `.env.local` (not `.env`)
- Restart your development server after creating the file
- Check that the variable name starts with `VITE_`

### Webhook URL Not Working
- Verify the URL is correct in your `.env.local` file
- Check that your n8n workflow is active
- Test the URL directly in your browser

## 🎯 Quick Start

1. **Copy the example file:**
   ```bash
   cp env.example .env.local
   ```

2. **Edit with your values:**
   ```bash
   nano .env.local
   ```

3. **Restart your app:**
   ```bash
   npm run dev
   ```

4. **Test the integration!**

Your webhook URL is now securely stored in environment variables! 🔐✨
