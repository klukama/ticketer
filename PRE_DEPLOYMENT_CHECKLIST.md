# Pre-Deployment Checklist

Use this checklist before deploying to Jelastic Cloud.

## ✅ Before You Start

### 1. Prerequisites
- [ ] Jelastic account with Infomaniak or other provider
- [ ] Access to Jelastic dashboard
- [ ] GitHub repository URL (if using Git deployment)
- [ ] Strong MySQL password ready (min 12 characters)

### 2. Line Endings (Windows Users Only)
If you're on Windows, convert shell scripts to LF line endings:

**Option A - PowerShell:**
```powershell
cd C:\Users\Markus\Sachen\JKW\ticketer
(Get-Content docker-entrypoint.sh -Raw).Replace("`r`n", "`n") | Set-Content docker-entrypoint.sh -NoNewline
(Get-Content jelastic-setup.sh -Raw).Replace("`r`n", "`n") | Set-Content jelastic-setup.sh -NoNewline
(Get-Content validate-jelastic-config.sh -Raw).Replace("`r`n", "`n") | Set-Content validate-jelastic-config.sh -NoNewline
```

**Option B - VS Code:**
- [ ] Open `docker-entrypoint.sh` → Click "CRLF" → Select "LF" → Save
- [ ] Open `jelastic-setup.sh` → Click "CRLF" → Select "LF" → Save
- [ ] Open `validate-jelastic-config.sh` → Click "CRLF" → Select "LF" → Save

**Option C - Git:**
```bash
git add --renormalize .
git commit -m "Normalize line endings"
```

### 3. Update manifest.jps (if using one-click install)
- [ ] Open `manifest.jps`
- [ ] Update line 90: Replace GitHub URL with your repository
  ```json
  "archive": "https://github.com/YOUR_USERNAME/ticketer/archive/refs/heads/main.zip"
  ```

## 📋 Deployment Method Selection

Choose ONE method:

### Method 1: One-Click Installation ⚡ (Fastest)
**Best for**: Quick deployment, testing

**Steps:**
1. [ ] Upload `manifest.jps` to GitHub (in your repository root)
2. [ ] Go to Jelastic Dashboard → **Import**
3. [ ] Paste URL: `https://raw.githubusercontent.com/YOUR_USERNAME/ticketer/main/manifest.jps`
4. [ ] Click Import → Fill database password → Install
5. [ ] Wait 10-15 minutes
6. [ ] Access application at provided URL

**See**: `MANIFEST_README.md`

---

### Method 2: Manual 3-Node Setup 🔧 (Most Control)
**Best for**: Production deployments, custom configurations

**Steps:**
1. [ ] Read `JELASTIC_3NODE_SETUP.md` completely
2. [ ] Create environment in Jelastic (Nginx + Node.js + MySQL)
3. [ ] Configure MySQL database and user
4. [ ] Deploy application code
5. [ ] Set environment variables
6. [ ] Build application (with optimized commands)
7. [ ] Configure Nginx reverse proxy
8. [ ] Start and verify

**See**: `JELASTIC_3NODE_SETUP.md`

---

## 🔑 Information You'll Need

Collect this information before starting:

### MySQL Configuration
- [ ] Database name: `ticketer` (recommended)
- [ ] Database user: `ticketer` (recommended)
- [ ] Database password: `___________________` (your strong password)

### After Environment Creation
- [ ] MySQL Internal IP: `___________________`
- [ ] Node.js Internal IP: `___________________`
- [ ] Environment URL: `___________________`

## ⚙️ Cloudlet Allocation Plan

### For Initial Build (Temporary)
- **Nginx**: 8 cloudlets
- **Node.js**: 32 cloudlets ⚠️ (required for build)
- **MySQL**: 16 cloudlets

### After Build Complete (Reduce to Save Costs)
- **Nginx**: 4-8 cloudlets
- **Node.js**: 8-16 cloudlets ✅ (reduce here)
- **MySQL**: 8-16 cloudlets

**Remember**: Reduce Node.js cloudlets after successful build!

## 🚀 Post-Deployment Tasks

### Immediately After Deployment
- [ ] Access application URL - verify homepage loads
- [ ] Test `/api/health` endpoint - should return 200 OK
- [ ] Access `/admin` - verify admin panel works
- [ ] Create test event - verify database connection
- [ ] View event - verify seat selection works

### Optimization (First 24 Hours)
- [ ] Reduce Node.js cloudlets from 32 to 8-16
- [ ] Monitor CPU/RAM usage in Jelastic dashboard
- [ ] Adjust cloudlets based on actual usage
- [ ] Set auto-scaling triggers (CPU > 70%, RAM > 80%)

### Security Hardening
- [ ] Enable SSL/TLS via Let's Encrypt
- [ ] Add custom domain (optional)
- [ ] Verify environment variables are not exposed
- [ ] Test application restart (ensure auto-start works)

### Reliability
- [ ] Configure MySQL automated backups (daily, 7-day retention)
- [ ] Set up monitoring alerts (CPU, RAM, disk, uptime)
- [ ] Document credentials securely (password manager)
- [ ] Test database restore procedure

## 📊 Success Criteria

Your deployment is successful when:

- [ ] ✅ Application loads at environment URL
- [ ] ✅ Admin panel accessible at `/admin`
- [ ] ✅ Health endpoint returns 200 at `/api/health`
- [ ] ✅ Events page loads and displays events
- [ ] ✅ Seat selection works (click seats, book)
- [ ] ✅ Data persists after Node.js restart
- [ ] ✅ No errors in Node.js logs
- [ ] ✅ No errors in Nginx logs
- [ ] ✅ MySQL connection stable

## 🆘 Troubleshooting Resources

If you encounter issues:

1. **Memory Issues (Killed during build)**
   - See `DOCKER_FIXES.md` → OOM section
   - Increase cloudlets to 32-48 temporarily

2. **Nginx 502 Bad Gateway**
   - See `JELASTIC_3NODE_SETUP.md` → Troubleshooting
   - Check Node.js internal IP in nginx config

3. **Database Connection Failed**
   - See `JELASTIC_DEPLOYMENT.md` → Troubleshooting
   - Verify DATABASE_URL environment variable

4. **Application Won't Start**
   - Check Node.js logs in Jelastic dashboard
   - Verify `npm start` command is set
   - Check `.next/standalone/server.js` exists

## 📚 Documentation Quick Reference

| Need to... | Read this... |
|------------|--------------|
| Deploy quickly | `MANIFEST_README.md` |
| Manual step-by-step | `JELASTIC_3NODE_SETUP.md` ⭐ |
| Detailed guide | `JELASTIC_DEPLOYMENT.md` |
| Quick reference | `JELASTIC_QUICKSTART.md` |
| Configuration overview | `JELASTIC_CONFIGURATION_SUMMARY.md` |
| Fix Docker issues | `DOCKER_FIXES.md` |

## 🎯 Ready to Deploy?

### Recommended Path:

1. **First-time deployer?**
   - Start here: `JELASTIC_3NODE_SETUP.md`
   - Follow step-by-step instructions
   - Should take 30-45 minutes

2. **Experienced with Jelastic?**
   - Use: `JELASTIC_QUICKSTART.md`
   - Deploy in 15-20 minutes

3. **Want automated setup?**
   - Use: One-click manifest installation
   - Deploy in 10-15 minutes

---

**All prerequisites complete?** 

✅ **Start deployment**: Open `JELASTIC_3NODE_SETUP.md`

Good luck! 🚀
