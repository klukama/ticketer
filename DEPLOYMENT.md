# Deployment Overview

This document provides an overview of all deployment options available for the Ticketer application.

## 🎯 Quick Links

- **[Kubernetes Deployment Guide](./KUBERNETES_DEPLOYMENT.md)** - Deploy with Kubernetes (recommended for production)
- **[Infomaniak Deployment Guide](./INFOMANIAK_DEPLOYMENT.md)** - Deploy directly to Infomaniak Public Cloud
- **[Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)** - Pre and post-deployment verification checklist
- **[Docker Documentation](./README.md#docker-deployment)** - Docker and Docker Compose deployment

## 📋 Deployment Options Comparison

| Feature | Kubernetes | Docker (Infomaniak) | Docker Compose |
|---------|------------|---------------------|----------------|
| **Scalability** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐ Good | ⭐⭐ Limited |
| **High Availability** | ✅ Built-in | ⚠️ Manual setup | ❌ Single instance |
| **Auto-scaling** | ✅ HPA | ❌ Manual | ❌ Manual |
| **Load Balancing** | ✅ Built-in | ⚠️ External required | ❌ Not included |
| **Rolling Updates** | ✅ Zero-downtime | ⚠️ Brief downtime | ⚠️ Brief downtime |
| **Health Checks** | ✅ Liveness/Readiness | ⚠️ Manual setup | ⚠️ Manual setup |
| **Complexity** | ⭐⭐⭐⭐ High | ⭐⭐ Medium | ⭐ Low |
| **Best For** | Production at scale | Production (simple) | Development/Testing |

## 🚀 Recommended Deployment Path

### For Production (High Traffic)
1. **Kubernetes** ([guide](./KUBERNETES_DEPLOYMENT.md))
   - Best for: Multi-region, high availability, auto-scaling
   - Infrastructure: Infomaniak Kubernetes, GKE, EKS, AKS
   - Database: Infomaniak Managed MySQL

### For Production (Simple)
2. **Docker on Infomaniak Public Cloud** ([guide](./INFOMANIAK_DEPLOYMENT.md))
   - Best for: Smaller deployments, simpler operations
   - Infrastructure: Infomaniak Public Cloud VM
   - Database: Infomaniak Managed MySQL

### For Development/Testing
3. **Docker Compose** ([guide](./README.md#docker-deployment))
   - Best for: Local development, testing
   - Infrastructure: Local machine
   - Database: Local MySQL container

## 🏗️ Architecture Components

All deployment options include:

### Application Layer
- **Next.js 16**: React framework with server-side rendering
- **Node.js 20**: JavaScript runtime (Alpine Linux in containers)
- **Port 3000**: Default application port

### Database Layer
- **MySQL 8.0**: Relational database
- **Prisma ORM**: Database toolkit and query builder
- **Infomaniak Managed DB**: Recommended for production

### Monitoring
- **Health Endpoint**: `/api/health` for monitoring
- **Liveness Probe**: Kubernetes health check
- **Readiness Probe**: Kubernetes readiness check

## 📦 What's Included

### Kubernetes Deployment (`k8s/` directory)
```
k8s/
├── namespace.yaml           # Namespace definition
├── configmap.yaml          # Non-sensitive configuration
├── secret.yaml.template    # Template for database credentials
├── deployment.yaml         # Application deployment with 2 replicas
├── service.yaml            # ClusterIP service
├── ingress.yaml           # HTTP/HTTPS ingress
├── hpa.yaml               # Horizontal Pod Autoscaler
└── kustomization.yaml     # Kustomize configuration
```

### Helper Scripts
- `create-k8s-secret.sh` - Generate Kubernetes secrets
- `start-production.sh` - Production startup script
- `Makefile` - Common Kubernetes operations

### Configuration Files
- `.env.production.example` - Production environment template
- `nginx.conf.example` - Nginx reverse proxy configuration
- `ticketer.service` - Systemd service file

### Documentation
- `KUBERNETES_DEPLOYMENT.md` - Complete Kubernetes guide
- `INFOMANIAK_DEPLOYMENT.md` - Infomaniak deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Deployment verification checklist
- `README.md` - General documentation

## 🔧 Infrastructure Requirements

### Minimum Requirements
- **CPU**: 250m (0.25 cores)
- **Memory**: 256Mi
- **Disk**: 1GB (for application)
- **Node.js**: 20+
- **Database**: MySQL 8.0+

### Recommended for Production
- **CPU**: 500m - 1 core per replica
- **Memory**: 512Mi - 1Gi per replica
- **Replicas**: 2-3 minimum for HA
- **Database**: Managed MySQL with backups

## 🗄️ Database Setup

### Infomaniak Managed MySQL (Recommended)
1. Sign up at [Infomaniak Public Cloud](https://www.infomaniak.com/en/hosting/public-cloud)
2. Create a managed MySQL 8.0 database instance
3. Note credentials: host, username, password, database name
4. Configure connection in your deployment:
   ```
   DATABASE_URL="mysql://user:password@host:3306/database"
   ```

### Database Features
- **Automated backups**: Built-in with Infomaniak
- **High availability**: Managed by Infomaniak
- **Monitoring**: Infomaniak dashboard
- **Scaling**: Vertical scaling available

## 🛡️ Security Checklist

Before deploying to production:

- [ ] All secrets stored in Kubernetes secrets or environment variables
- [ ] No secrets committed to git (check with `git log -S "password"`)
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Database uses strong password (16+ characters)
- [ ] Firewall rules configured (database accessible only from app)
- [ ] Regular security updates planned
- [ ] Health endpoint monitored
- [ ] Backup and recovery tested

## 📊 Monitoring & Observability

### Built-in Monitoring
- **Health Endpoint**: `GET /api/health`
  - Returns 200 OK when healthy
  - Returns 503 when database disconnected
  - Response includes timestamp and status

### External Monitoring (Recommended)
- **Uptime monitoring**: UptimeRobot, Pingdom, StatusCake
- **APM**: New Relic, Datadog, AppDynamics
- **Logs**: ELK Stack, Loki, CloudWatch
- **Metrics**: Prometheus + Grafana

## 🔄 Update Procedures

### Kubernetes
```bash
# Build new version
docker build -t registry/ticketer:v1.1.0 .
docker push registry/ticketer:v1.1.0

# Update deployment
make update IMAGE_TAG=v1.1.0

# Or manually
kubectl set image deployment/ticketer ticketer=registry/ticketer:v1.1.0 -n ticketer
```

### Docker (Infomaniak)
```bash
# Pull latest code
git pull

# Rebuild and restart
docker build -t ticketer:latest .
docker stop ticketer
docker rm ticketer
docker run -d --name ticketer [options] ticketer:latest
```

## 🆘 Getting Help

### Resources
- **Application Issues**: [GitHub Issues](https://github.com/klukama/ticketer/issues)
- **Kubernetes**: [Official Docs](https://kubernetes.io/docs/)
- **Next.js**: [Documentation](https://nextjs.org/docs)
- **Prisma**: [Documentation](https://www.prisma.io/docs)
- **Infomaniak**: [Support Portal](https://www.infomaniak.com/en/support)

### Common Issues

#### Build Failures
- Check Node.js version (requires 20+)
- Run `npm ci` to clean install dependencies
- Verify DATABASE_URL is set (even placeholder for build)

#### Database Connection
- Verify credentials in secret/environment
- Check database is accessible from cluster/server
- Test connection: `kubectl exec -it <pod> -- npm run db:push`

#### Health Check Failures
- Database is down or unreachable
- Wrong DATABASE_URL format
- Network/firewall blocking connection

## 📈 Scaling Guide

### Horizontal Scaling (Kubernetes)
```bash
# Manual scaling
make scale REPLICAS=5

# Auto-scaling (HPA already configured)
# Scales between 2-10 replicas based on CPU/memory
kubectl get hpa -n ticketer
```

### Vertical Scaling
Edit `k8s/deployment.yaml`:
```yaml
resources:
  requests:
    memory: "512Mi"  # Increase as needed
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

### Database Scaling
- Vertical: Increase database instance size in Infomaniak
- Read replicas: Configure in Infomaniak for read-heavy workloads

## 🎓 Best Practices

### Development
- Use Docker Compose for local development
- Test with SQLite for quick iterations
- Use MySQL locally to match production

### Staging
- Deploy to staging environment first
- Use Kubernetes for staging if using for production
- Test with production-like data volumes

### Production
- Use Kubernetes for production workloads
- Enable auto-scaling (HPA)
- Configure monitoring and alerting
- Regular backups and backup testing
- Document runbooks for common operations

## 📝 Next Steps

1. **Choose your deployment method** based on requirements
2. **Follow the relevant guide**:
   - [Kubernetes Guide](./KUBERNETES_DEPLOYMENT.md)
   - [Infomaniak Guide](./INFOMANIAK_DEPLOYMENT.md)
3. **Use the checklist**: [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
4. **Set up monitoring** for your deployment
5. **Test thoroughly** before going live

## 🎉 Quick Start Commands

### Kubernetes
```bash
# Build and push image
docker build -t your-registry/ticketer:v1.0.0 .
docker push your-registry/ticketer:v1.0.0

# Create secret
./create-k8s-secret.sh

# Deploy
make deploy

# Check status
make status
```

### Docker (Simple)
```bash
# Build image
docker build -t ticketer:latest .

# Run container
docker run -d --name ticketer \
  -p 3000:3000 \
  -e DATABASE_URL="mysql://user:pass@host:3306/db" \
  ticketer:latest

# Check logs
docker logs -f ticketer
```

### Development
```bash
# Start with Docker Compose
docker compose up -d

# Or run locally
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

---

**Ready to deploy?** Start with the [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) to ensure you haven't missed anything! 🚀
