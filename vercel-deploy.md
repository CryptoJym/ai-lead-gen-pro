# Vercel Deployment Guide for AI Lead Gen Pro

## 🚀 Quick Deploy

The project is already deployed at: https://ai-lead-gen-pro.vercel.app

## 📋 Deployment Configuration

### Environment Variables (Production)
```env
NEXT_PUBLIC_API_URL=https://ai-lead-gen-pro.vercel.app
NEXT_PUBLIC_ENABLE_MOCK_MODE=false
DAILY_RESEARCH_CAP_PER_TENANT=50
MAX_CONCURRENT_RESEARCH_JOBS=3
ENABLE_CACHE=true
ENABLE_LLM_SYNTHESIS=true
ENABLE_MOCK_MODE=false
```

### Build Settings
- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

## 🎨 Deployed Visualizations

1. **System Flow Visualization**: `/docs/system-flow-visualization.html`
   - D3.js force-directed graph
   - Shows 5-pass Horsemen analysis pattern
   - Interactive node exploration

2. **Interactive Demo**: `/docs/interactive-demo.html`
   - GSAP-animated interface
   - Mock data demonstration
   - Real-time progress visualization

3. **3D Analysis Flow**: `/docs/3d-analysis-flow.html`
   - Three.js/WebGL visualization
   - 3D representation of analysis stages
   - Orbit controls for exploration

## 🔧 Manual Deployment Steps

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables**:
   ```bash
   vercel env add ENABLE_MOCK_MODE production
   # Enter: false
   ```

## 🌐 Custom Domain Setup

To add a custom domain:

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the `ai-lead-gen-pro` project
3. Go to Settings → Domains
4. Add your custom domain
5. Follow DNS configuration instructions

## 📊 Monitoring

- **Analytics**: Available in Vercel Dashboard
- **Logs**: Real-time logs at `https://vercel.com/[team]/ai-lead-gen-pro/logs`
- **Performance**: Web Vitals tracking enabled

## 🔐 Security

- CORS headers configured for API routes
- Rate limiting enabled
- Mock mode disabled in production
- Environment variables secured

## 🚨 Troubleshooting

### Deployment Fails
- Check build logs in Vercel Dashboard
- Ensure all dependencies are in `package.json`
- Verify environment variables are set

### 404 Errors
- Static files are served from `/public`
- API routes are in `/src/app/api`
- Visualizations are at `/docs/*.html`

### Performance Issues
- Enable caching: `ENABLE_CACHE=true`
- Adjust rate limits in `vercel.json`
- Use CDN for static assets

## 📚 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [GitHub Repository](https://github.com/CryptoJym/ai-lead-gen-pro)