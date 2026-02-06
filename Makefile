# Makefile for Ticketer Kubernetes Deployment
# Provides convenient commands for common operations

.PHONY: help build push deploy clean status logs shell restart scale

# Variables
IMAGE_NAME ?= ticketer
IMAGE_TAG ?= latest
REGISTRY ?= your-registry
NAMESPACE ?= ticketer
REPLICAS ?= 2

help: ## Show this help message
	@echo "Ticketer - Kubernetes Deployment Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build Docker image
	docker build -t $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG) .
	@echo "✅ Image built: $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG)"

push: ## Push Docker image to registry
	docker push $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG)
	@echo "✅ Image pushed: $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG)"

build-push: build push ## Build and push Docker image

deploy: ## Deploy to Kubernetes
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -k k8s/
	@echo "✅ Deployed to Kubernetes"
	@echo "Check status with: make status"

update: ## Update running deployment with new image
	kubectl set image deployment/ticketer ticketer=$(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG) -n $(NAMESPACE)
	kubectl rollout status deployment/ticketer -n $(NAMESPACE)
	@echo "✅ Deployment updated"

rollback: ## Rollback to previous deployment
	kubectl rollout undo deployment/ticketer -n $(NAMESPACE)
	kubectl rollout status deployment/ticketer -n $(NAMESPACE)
	@echo "✅ Rolled back to previous version"

delete: ## Delete all Kubernetes resources
	kubectl delete -k k8s/ || true
	@echo "✅ Resources deleted"

clean: delete ## Alias for delete

status: ## Show deployment status
	@echo "=== Namespace ==="
	kubectl get namespace $(NAMESPACE) || echo "Namespace not found"
	@echo ""
	@echo "=== All Resources ==="
	kubectl get all -n $(NAMESPACE)
	@echo ""
	@echo "=== Ingress ==="
	kubectl get ingress -n $(NAMESPACE)
	@echo ""
	@echo "=== HPA ==="
	kubectl get hpa -n $(NAMESPACE)

pods: ## List pods
	kubectl get pods -n $(NAMESPACE) -o wide

logs: ## Show logs from deployment
	kubectl logs -f deployment/ticketer -n $(NAMESPACE)

logs-pod: ## Show logs from a specific pod (use POD=<name>)
	@if [ -z "$(POD)" ]; then \
		echo "Usage: make logs-pod POD=<pod-name>"; \
		echo "Available pods:"; \
		kubectl get pods -n $(NAMESPACE) -o name; \
	else \
		kubectl logs -f $(POD) -n $(NAMESPACE); \
	fi

shell: ## Open shell in a pod (use POD=<name> or first pod if not specified)
	@if [ -z "$(POD)" ]; then \
		POD_NAME=$$(kubectl get pod -n $(NAMESPACE) -l app=ticketer -o jsonpath='{.items[0].metadata.name}'); \
		echo "Opening shell in $$POD_NAME..."; \
		kubectl exec -it $$POD_NAME -n $(NAMESPACE) -- sh; \
	else \
		kubectl exec -it $(POD) -n $(NAMESPACE) -- sh; \
	fi

restart: ## Restart deployment
	kubectl rollout restart deployment/ticketer -n $(NAMESPACE)
	kubectl rollout status deployment/ticketer -n $(NAMESPACE)
	@echo "✅ Deployment restarted"

scale: ## Scale deployment (use REPLICAS=n)
	kubectl scale deployment/ticketer --replicas=$(REPLICAS) -n $(NAMESPACE)
	@echo "✅ Scaled to $(REPLICAS) replicas"

health: ## Check health endpoint
	@POD_NAME=$$(kubectl get pod -n $(NAMESPACE) -l app=ticketer -o jsonpath='{.items[0].metadata.name}'); \
	echo "Checking health from $$POD_NAME..."; \
	kubectl exec $$POD_NAME -n $(NAMESPACE) -- wget -q -O- http://localhost:3000/api/health | jq .

events: ## Show recent events
	kubectl get events -n $(NAMESPACE) --sort-by='.lastTimestamp' | tail -20

describe: ## Describe deployment
	kubectl describe deployment ticketer -n $(NAMESPACE)

top: ## Show resource usage
	@echo "=== Node Resources ==="
	kubectl top nodes
	@echo ""
	@echo "=== Pod Resources ==="
	kubectl top pods -n $(NAMESPACE)

secret: ## Create Kubernetes secret (interactive)
	./create-k8s-secret.sh

db-push: ## Run database migrations
	@POD_NAME=$$(kubectl get pod -n $(NAMESPACE) -l app=ticketer -o jsonpath='{.items[0].metadata.name}'); \
	echo "Running migrations in $$POD_NAME..."; \
	kubectl exec $$POD_NAME -n $(NAMESPACE) -- npm run db:push

db-seed: ## Seed database
	@POD_NAME=$$(kubectl get pod -n $(NAMESPACE) -l app=ticketer -o jsonpath='{.items[0].metadata.name}'); \
	echo "Seeding database in $$POD_NAME..."; \
	kubectl exec $$POD_NAME -n $(NAMESPACE) -- npm run db:seed

port-forward: ## Port forward to local machine (default: 8080:80)
	@echo "Forwarding http://localhost:8080 to service..."
	kubectl port-forward svc/ticketer 8080:80 -n $(NAMESPACE)

# Development helpers
dev-build-deploy: build push update ## Build, push and deploy in one command

# Verification
verify: ## Verify deployment is working
	@echo "=== Checking Pods ==="
	@kubectl get pods -n $(NAMESPACE) -o wide
	@echo ""
	@echo "=== Checking Health ==="
	@POD_NAME=$$(kubectl get pod -n $(NAMESPACE) -l app=ticketer -o jsonpath='{.items[0].metadata.name}'); \
	kubectl exec $$POD_NAME -n $(NAMESPACE) -- wget -q -O- http://localhost:3000/api/health || echo "Health check failed"
	@echo ""
	@echo "=== Checking Ingress ==="
	@kubectl get ingress -n $(NAMESPACE)
