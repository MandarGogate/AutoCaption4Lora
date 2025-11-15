# 🚀 Quick Start Guide

Get your modern LORA Helper app running in 3 minutes!

## Step 1: Install Dependencies

```bash
cd nextjs-app
npm install
```

This will install all required packages including:
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Google Gemini AI SDK

## Step 2: Set Up Environment

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

3. Edit `.env` and add your API key:
   ```env
   GEMINI_API_KEY=AIza...your_key_here
   ```

## Step 3: Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

## What You Get

✅ **Modern Next.js 15 App** with App Router
✅ **TypeScript** for type safety
✅ **shadcn/ui Components** - beautiful, accessible UI
✅ **Tailwind CSS** - utility-first styling
✅ **Google Gemini AI** - advanced image captioning
✅ **Drag & Drop Upload** - intuitive UX
✅ **Real-time Processing** - watch logs as images process
✅ **ZIP Export** - download complete datasets

## Next Steps

1. **Upload images** - Drag & drop or click to browse
2. **Configure settings** - Customize captions and keywords
3. **Process** - Let Gemini AI generate captions
4. **Download** - Get your complete dataset as ZIP

## Need Help?

- Check the full [README.md](./README.md) for detailed documentation
- Ensure your Gemini API key is valid
- Make sure you're using Node.js 18 or higher

## Production Build

When ready to deploy:

```bash
npm run build
npm start
```

Or deploy to Vercel with one click!

---

Happy training! 🎨✨
