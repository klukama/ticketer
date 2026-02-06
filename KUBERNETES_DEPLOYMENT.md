# Kubernetes Deployment Guide for Ticketer

This guide explains how to deploy the Ticketer application on Kubernetes with Infomaniak's managed MySQL database.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Scaling](#scaling)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

1. **Kubernetes Cluster**: A running Kubernetes cluster (v1.24+)
   - Can be Infomaniak Public Cloud Kubernetes, Google GKE, Amazon EKS, Azure AKS, or self-hosted
2. **kubectl**: Command-line tool installed and configured
3. **Infomaniak Managed MySQL Database**: See [INFOMANIAK_DEPLOYMENT.md](./INFOMANIAK_DEPLOYMENT.md) for setup
4. **Docker Registry**: Access to a container registry (Docker Hub, GitHub Container Registry, Google Container Registry, etc.)
5. **Ingress Controller** (optional): For external access (nginx-ingress, Traefik, etc.)

## Quick Start

### 1. Build and Push Docker Image

```bash
# Build the Docker image
docker build -t your-registry/ticketer:v1.0.0 .

# Push to your registry
docker push your-registry/ticketer:v1.0.0
```

### 2. Create Kubernetes Secret

```bash
# Create secret from DATABASE_URL
kubectl create secret generic ticketer-secret \
  --from-literal=DATABASE_URL='mysql://user:password@db-host.infomaniak.com:3306/ticketer' \
  --namespace=ticketer \
  --dry-run=client -o yaml > k8s/secret.yaml

# Apply the secret
kubectl apply -f k8s/secret.yaml
```

### 3. Update Configuration

Edit `k8s/ingress.yaml` and replace `ticketer.yourdomain.com` with your actual domain.

Edit `k8s/kustomization.yaml` and update the image name and tag.

### 4. Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Deploy all resources using kustomize
kubectl apply -k k8s/

# Or deploy individually
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
```

### 5. Verify Deployment

```bash
# Check all resources
kubectl get all -n ticketer

# Check pod status
kubectl get pods -n ticketer

# Check logs
kubectl logs -f deployment/ticketer -n ticketer

# Check health endpoint
kubectl port-forward svc/ticketer 8080:80 -n ticketer
# Then visit: http://localhost:8080/api/health
```

## Detailed Setup

### Building the Docker Image

The application includes a production-ready Dockerfile with multi-stage builds:

```bash
# Build with version tag
VERSION=v1.0.0
docker build -t your-registry/ticketer:$VERSION .
docker tag your-registry/ticketer:$VERSION your-registry/ticketer:latest

# Push both tags
docker push your-registry/ticketer:$VERSION
docker push your-registry/ticketer:latest
```

### Container Registry Setup

#### Using Docker Hub
```bash
docker login
docker build -t yourusername/ticketer:v1.0.0 .
docker push yourusername/ticketer:v1.0.0
```

#### Using GitHub Container Registry
```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
docker build -t ghcr.io/username/ticketer:v1.0.0 .
docker push ghcr.io/username/ticketer:v1.0.0
```

#### Using Private Registry with Authentication

Create image pull secret:
```bash
kubectl create secret docker-registry regcred \
  --docker-server=your-registry.com \
  --docker-username=your-username \
  --docker-password=your-password \
  --docker-email=your-email@example.com \
  --namespace=ticketer
```

Then uncomment `imagePullSecrets` in `k8s/deployment.yaml`.

## Configuration

### ConfigMap (k8s/configmap.yaml)

Non-sensitive configuration:
- `NODE_ENV`: Environment mode (production)
- `NEXT_TELEMETRY_DISABLED`: Disable telemetry
- `PORT`: Application port
- `HOSTNAME`: Bind address

To update:
```bash
kubectl edit configmap ticketer-config -n ticketer
# Or edit the file and apply:
kubectl apply -f k8s/configmap.yaml
```

### Secret (k8s/secret.yaml)

Sensitive data stored as Kubernetes secrets:
- `DATABASE_URL`: Infomaniak MySQL connection string

**Creating the Secret:**

Option 1: From literal values
```bash
kubectl create secret generic ticketer-secret \
  --from-literal=DATABASE_URL='mysql://user:password@host:3306/db' \
  --namespace=ticketer
```

Option 2: From template file
```bash
# Copy template
cp k8s/secret.yaml.template k8s/secret.yaml

# Encode your DATABASE_URL
echo -n "mysql://user:password@db-host.infomaniak.com:3306/ticketer" | base64

# Edit k8s/secret.yaml and paste the base64 value
# Then apply
kubectl apply -f k8s/secret.yaml
```

**Important**: Add `k8s/secret.yaml` to `.gitignore`:
```bash
echo "k8s/secret.yaml" >> .gitignore
```

### Deployment Configuration

Key configuration in `k8s/deployment.yaml`:

- **Replicas**: Set to 2 by default for high availability
- **Resources**:
  - Requests: 256Mi memory, 250m CPU
  - Limits: 512Mi memory, 500m CPU
- **Probes**:
  - Liveness probe: Checks `/api/health` every 10s
  - Readiness probe: Checks `/api/health` every 5s

Adjust these values based on your needs and cluster capacity.

### Ingress Configuration

The ingress exposes the application externally. Update `k8s/ingress.yaml`:

```yaml
spec:
  rules:
  - host: ticketer.yourdomain.com  # Your actual domain
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ticketer
            port:
              number: 80
```

#### Setting up TLS/HTTPS

##### Option 1: Using cert-manager (Recommended)

Install cert-manager:
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

Create ClusterIssuer:
```bash
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

Update ingress with TLS:
```yaml
metadata:
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - ticketer.yourdomain.com
    secretName: ticketer-tls
```

##### Option 2: Manual Certificate

Create TLS secret with your certificates:
```bash
kubectl create secret tls ticketer-tls \
  --cert=path/to/cert.crt \
  --key=path/to/cert.key \
  --namespace=ticketer
```

## Deployment

### Initial Deployment

```bash
# Apply all Kubernetes resources
kubectl apply -k k8s/

# Watch deployment progress
kubectl rollout status deployment/ticketer -n ticketer

# Check pod status
kubectl get pods -n ticketer -w
```

### Updating the Application

```bash
# Build new version
docker build -t your-registry/ticketer:v1.1.0 .
docker push your-registry/ticketer:v1.1.0

# Update deployment
kubectl set image deployment/ticketer \
  ticketer=your-registry/ticketer:v1.1.0 \
  -n ticketer

# Or update kustomization.yaml and apply
kubectl apply -k k8s/

# Watch rollout
kubectl rollout status deployment/ticketer -n ticketer
```

### Rolling Back

```bash
# View rollout history
kubectl rollout history deployment/ticketer -n ticketer

# Rollback to previous version
kubectl rollout undo deployment/ticketer -n ticketer

# Rollback to specific revision
kubectl rollout undo deployment/ticketer --to-revision=2 -n ticketer
```

## Scaling

### Manual Scaling

```bash
# Scale to 5 replicas
kubectl scale deployment/ticketer --replicas=5 -n ticketer

# Verify
kubectl get pods -n ticketer
```

### Auto-scaling (HPA)

The HPA is configured in `k8s/hpa.yaml`:
- Min replicas: 2
- Max replicas: 10
- CPU target: 70%
- Memory target: 80%

**Prerequisites**: Metrics Server must be installed:
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

Check HPA status:
```bash
kubectl get hpa -n ticketer
kubectl describe hpa ticketer -n ticketer
```

## Monitoring

### Pod Status and Logs

```bash
# Get all resources
kubectl get all -n ticketer

# Get pod details
kubectl describe pod <pod-name> -n ticketer

# View logs
kubectl logs -f deployment/ticketer -n ticketer

# View logs for specific pod
kubectl logs -f <pod-name> -n ticketer

# View previous container logs (if pod restarted)
kubectl logs <pod-name> -n ticketer --previous
```

### Health Check

```bash
# Port-forward to access health endpoint
kubectl port-forward svc/ticketer 8080:80 -n ticketer

# In another terminal, check health
curl http://localhost:8080/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-06T17:30:00.000Z",
  "database": "connected"
}
```

### Resource Usage

```bash
# View resource usage
kubectl top pods -n ticketer
kubectl top nodes

# View resource limits
kubectl describe deployment ticketer -n ticketer | grep -A 5 Limits
```

### Events

```bash
# View recent events
kubectl get events -n ticketer --sort-by='.lastTimestamp'

# Watch events in real-time
kubectl get events -n ticketer --watch
```

## Database Management

### Running Migrations

Exec into a pod to run database commands:

```bash
# Get pod name
POD_NAME=$(kubectl get pod -n ticketer -l app=ticketer -o jsonpath='{.items[0].metadata.name}')

# Run db push
kubectl exec -it $POD_NAME -n ticketer -- npm run db:push

# Run seed
kubectl exec -it $POD_NAME -n ticketer -- npm run db:seed
```

### Database Connection Testing

```bash
# Test database connectivity
kubectl exec -it $POD_NAME -n ticketer -- sh -c \
  'node -e "require(\"@prisma/client\").PrismaClient().then(c => c.\$queryRaw\`SELECT 1\`.then(console.log))"'
```

## Networking

### Internal Access (within cluster)

```bash
# Service is accessible at:
# ticketer.ticketer.svc.cluster.local:80
```

### External Access

#### Using Ingress
Access via configured domain: `https://ticketer.yourdomain.com`

#### Using Port-Forward (Development)
```bash
kubectl port-forward svc/ticketer 3000:80 -n ticketer
# Access at http://localhost:3000
```

#### Using NodePort (Not recommended for production)
```yaml
# Change service type in k8s/service.yaml
spec:
  type: NodePort
```

#### Using LoadBalancer
```yaml
# Change service type in k8s/service.yaml
spec:
  type: LoadBalancer
```

## Security Best Practices

### 1. Use Secrets for Sensitive Data
✅ Already implemented with `ticketer-secret`

### 2. Network Policies

Create network policy to restrict traffic:
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ticketer-network-policy
  namespace: ticketer
spec:
  podSelector:
    matchLabels:
      app: ticketer
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 3306  # MySQL
    - protocol: TCP
      port: 443   # HTTPS
    - protocol: TCP
      port: 53    # DNS
    - protocol: UDP
      port: 53    # DNS
```

### 3. Resource Limits
✅ Already configured in deployment.yaml

### 4. Security Context

Add to deployment.yaml:
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  fsGroup: 1001
  capabilities:
    drop:
    - ALL
  readOnlyRootFilesystem: false
```

### 5. Pod Security Standards

Label namespace:
```bash
kubectl label namespace ticketer \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n ticketer

# Describe pod for events
kubectl describe pod <pod-name> -n ticketer

# Check logs
kubectl logs <pod-name> -n ticketer
```

Common issues:
- **ImagePullBackOff**: Check image name and registry credentials
- **CrashLoopBackOff**: Check application logs for errors
- **Pending**: Check resource availability and node capacity

### Database Connection Issues

```bash
# Check secret
kubectl get secret ticketer-secret -n ticketer -o yaml

# Decode DATABASE_URL to verify
kubectl get secret ticketer-secret -n ticketer -o jsonpath='{.data.DATABASE_URL}' | base64 -d

# Test from pod
kubectl exec -it <pod-name> -n ticketer -- sh
# Inside pod:
echo $DATABASE_URL
```

### Health Check Failing

```bash
# Check liveness/readiness probe configuration
kubectl describe pod <pod-name> -n ticketer

# Manually test health endpoint
kubectl exec -it <pod-name> -n ticketer -- wget -O- http://localhost:3000/api/health
```

### Ingress Not Working

```bash
# Check ingress
kubectl get ingress -n ticketer
kubectl describe ingress ticketer -n ticketer

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Verify DNS resolution
nslookup ticketer.yourdomain.com
```

### Out of Memory/CPU

```bash
# Check resource usage
kubectl top pods -n ticketer

# Increase limits in deployment.yaml
# Or enable HPA for auto-scaling
```

## Advanced Configuration

### Using Helm (Alternative to Kustomize)

Create a basic Helm chart structure:
```bash
helm create ticketer-chart
# Then move k8s files to chart templates
```

### Blue-Green Deployment

```bash
# Deploy blue version
kubectl apply -f k8s-blue/

# Test blue version
# Switch traffic when ready
kubectl patch service ticketer -n ticketer -p '{"spec":{"selector":{"version":"blue"}}}'
```

### Database Initialization Job

For one-time database setup:
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: ticketer-db-init
  namespace: ticketer
spec:
  template:
    spec:
      containers:
      - name: db-init
        image: your-registry/ticketer:latest
        command: ["/bin/sh", "-c"]
        args:
        - |
          npx prisma db push
          npm run db:seed
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: ticketer-secret
              key: DATABASE_URL
      restartPolicy: OnFailure
```

## Production Checklist

Before going to production:

- [ ] Database backups configured in Infomaniak
- [ ] Secrets created and not committed to git
- [ ] Resource limits configured appropriately
- [ ] HPA enabled and tested
- [ ] Ingress configured with TLS/HTTPS
- [ ] Health checks working properly
- [ ] Monitoring/alerting set up
- [ ] Logs aggregation configured
- [ ] Network policies applied
- [ ] Image scanning completed
- [ ] Security context configured
- [ ] Database migrations tested
- [ ] Rollback procedure documented
- [ ] Load testing completed

## Useful Commands Reference

```bash
# Namespace
kubectl create namespace ticketer
kubectl delete namespace ticketer

# Apply/Delete
kubectl apply -k k8s/
kubectl delete -k k8s/

# Get resources
kubectl get all -n ticketer
kubectl get pods -n ticketer -o wide

# Logs
kubectl logs -f deployment/ticketer -n ticketer
kubectl logs <pod-name> -n ticketer --tail=100

# Execute commands
kubectl exec -it <pod-name> -n ticketer -- sh

# Port forward
kubectl port-forward svc/ticketer 8080:80 -n ticketer

# Describe
kubectl describe deployment ticketer -n ticketer
kubectl describe pod <pod-name> -n ticketer

# Scale
kubectl scale deployment/ticketer --replicas=3 -n ticketer

# Restart
kubectl rollout restart deployment/ticketer -n ticketer

# Events
kubectl get events -n ticketer --sort-by='.lastTimestamp'

# Resource usage
kubectl top pods -n ticketer
kubectl top nodes

# Secrets
kubectl create secret generic ticketer-secret --from-literal=key=value -n ticketer
kubectl get secret ticketer-secret -n ticketer -o yaml
```

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Ingress Controllers](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [Kustomize Documentation](https://kustomize.io/)
- [Infomaniak Public Cloud](https://www.infomaniak.com/en/hosting/public-cloud)

## Support

For issues specific to:
- **Application**: Check GitHub repository
- **Kubernetes**: Refer to cluster provider documentation
- **Infomaniak**: Contact Infomaniak support
