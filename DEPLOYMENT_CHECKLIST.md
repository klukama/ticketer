# Deployment Checklist

Use this checklist to ensure a successful deployment of Ticketer to production.

## Pre-Deployment

### Infrastructure Setup
- [ ] Kubernetes cluster is provisioned and accessible
- [ ] `kubectl` is installed and configured
- [ ] Access to container registry (Docker Hub, GHCR, etc.)
- [ ] Infomaniak MySQL database is created and accessible
- [ ] Database credentials are documented securely

### Application Preparation
- [ ] Code is tested and ready for production
- [ ] Database schema is finalized
- [ ] Environment variables are documented
- [ ] Docker image builds successfully locally
- [ ] Health endpoint (`/api/health`) returns 200 OK

### Security
- [ ] Secrets are NOT committed to version control
- [ ] `.gitignore` includes `k8s/secret.yaml` and `.env` files
- [ ] Database connection uses strong password
- [ ] Image scanning completed (no critical vulnerabilities)
- [ ] TLS/HTTPS certificates are ready (or cert-manager is configured)

## Deployment Steps

### 1. Build and Push Image
- [ ] Docker image built: `make build` or `docker build -t registry/ticketer:v1.0.0 .`
- [ ] Image tagged with version: `docker tag registry/ticketer:v1.0.0 registry/ticketer:latest`
- [ ] Image pushed to registry: `make push` or `docker push registry/ticketer:v1.0.0`
- [ ] Image is accessible from Kubernetes cluster

### 2. Configure Kubernetes
- [ ] Update `k8s/kustomization.yaml` with correct image name and tag
- [ ] Update `k8s/ingress.yaml` with your domain name
- [ ] Create Kubernetes secret: `./create-k8s-secret.sh` or manually
- [ ] Verify secret created: `kubectl get secret ticketer-secret -n ticketer`
- [ ] Review resource limits in `k8s/deployment.yaml`
- [ ] Review HPA configuration in `k8s/hpa.yaml`

### 3. Deploy to Kubernetes
- [ ] Create namespace: `kubectl apply -f k8s/namespace.yaml`
- [ ] Apply ConfigMap: `kubectl apply -f k8s/configmap.yaml`
- [ ] Apply Secret: `kubectl apply -f k8s/secret.yaml`
- [ ] Deploy application: `make deploy` or `kubectl apply -k k8s/`
- [ ] Verify deployment: `kubectl get pods -n ticketer`
- [ ] Check pod logs: `kubectl logs -f deployment/ticketer -n ticketer`

### 4. Database Initialization
- [ ] Database schema pushed: `make db-push` or manual exec
- [ ] Database seeded: `make db-seed` or manual exec
- [ ] Verify data in database (connect directly or via admin panel)

### 5. Networking Setup
- [ ] Service is running: `kubectl get svc -n ticketer`
- [ ] Ingress is configured: `kubectl get ingress -n ticketer`
- [ ] DNS records point to cluster IP/load balancer
- [ ] TLS certificate is issued and valid
- [ ] HTTPS redirect is working

## Post-Deployment Verification

### Application Testing
- [ ] Access application via domain (e.g., `https://ticketer.yourdomain.com`)
- [ ] Health endpoint responds: `/api/health` returns 200 OK
- [ ] Home page loads correctly
- [ ] Admin panel is accessible: `/admin`
- [ ] Can create a new event
- [ ] Can view event details and seat map
- [ ] Can book a seat
- [ ] Database queries are working

### Performance Testing
- [ ] Application responds within acceptable time (<1s for main pages)
- [ ] Multiple concurrent requests handled successfully
- [ ] Database connection pool is working
- [ ] Static assets are served correctly

### Monitoring Setup
- [ ] Health check endpoint is monitored (UptimeRobot, Pingdom, etc.)
- [ ] Log aggregation is configured (if applicable)
- [ ] Resource usage is monitored: `kubectl top pods -n ticketer`
- [ ] HPA is working: `kubectl get hpa -n ticketer`
- [ ] Alerts are configured for downtime/errors

### Security Verification
- [ ] HTTPS is enforced (HTTP redirects to HTTPS)
- [ ] No secrets in git history
- [ ] Database uses SSL/TLS connection (if required)
- [ ] Security headers are present (via nginx/ingress)
- [ ] No exposed sensitive endpoints

## Ongoing Operations

### Monitoring
- [ ] Set up monitoring dashboard (Grafana, etc.)
- [ ] Configure alerting for critical issues
- [ ] Review logs regularly
- [ ] Track resource usage trends

### Maintenance
- [ ] Document update procedure
- [ ] Document rollback procedure
- [ ] Schedule regular database backups verification
- [ ] Plan for dependency updates
- [ ] Security patch schedule established

### Backup & Recovery
- [ ] Database backups are configured in Infomaniak
- [ ] Backup restoration tested
- [ ] Disaster recovery plan documented
- [ ] RTO/RPO defined and achievable

## Troubleshooting Guide

### If Pods Are Not Starting
1. Check events: `kubectl describe pod <pod-name> -n ticketer`
2. Check logs: `kubectl logs <pod-name> -n ticketer`
3. Verify image exists: `docker pull registry/ticketer:version`
4. Check resource limits: `kubectl describe deployment ticketer -n ticketer`

### If Health Check Fails
1. Check database connection: `kubectl exec -it <pod-name> -n ticketer -- env | grep DATABASE_URL`
2. Test from within pod: `kubectl exec -it <pod-name> -n ticketer -- wget -O- http://localhost:3000/api/health`
3. Check database is accessible from cluster
4. Verify DATABASE_URL in secret is correct

### If Ingress Not Working
1. Verify ingress controller is running
2. Check ingress configuration: `kubectl describe ingress ticketer -n ticketer`
3. Verify DNS is pointing to correct IP
4. Check TLS certificate: `kubectl get certificate -n ticketer`
5. Review ingress controller logs

### If Application Is Slow
1. Check resource usage: `kubectl top pods -n ticketer`
2. Check database performance in Infomaniak dashboard
3. Review application logs for slow queries
4. Consider scaling: `make scale REPLICAS=5`
5. Review HPA settings

## Rollback Procedure

If issues occur after deployment:

1. **Immediate rollback**:
   ```bash
   make rollback
   # or
   kubectl rollout undo deployment/ticketer -n ticketer
   ```

2. **Verify rollback**:
   ```bash
   kubectl rollout status deployment/ticketer -n ticketer
   kubectl get pods -n ticketer
   ```

3. **Check application is working**:
   - Visit health endpoint
   - Test critical functionality

4. **Investigate issue**:
   - Review logs from failed deployment
   - Check events for errors
   - Document issue for future reference

## Production Readiness Scorecard

Rate each area (1-5, where 5 is production-ready):

- [ ] **Application Stability**: _____/5
- [ ] **Security**: _____/5
- [ ] **Monitoring**: _____/5
- [ ] **Documentation**: _____/5
- [ ] **Backup/Recovery**: _____/5
- [ ] **Performance**: _____/5
- [ ] **Scalability**: _____/5

**Total Score**: _____/35

Recommended minimum score for production: **28/35** (80%)

## Sign-off

- [ ] Development Lead: _________________ Date: _______
- [ ] DevOps Lead: _________________ Date: _______
- [ ] Security Review: _________________ Date: _______

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Version**: _______________
**Notes**: 
_______________________________________________________
_______________________________________________________
_______________________________________________________
