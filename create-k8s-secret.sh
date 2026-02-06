#!/bin/bash
# Helper script to create Kubernetes secret for Ticketer application
# This script generates a Kubernetes secret YAML file from your environment variables

set -e

echo "=========================================="
echo "Ticketer - Kubernetes Secret Generator"
echo "=========================================="
echo ""

# Check if running in the correct directory
if [ ! -f "k8s/secret.yaml.template" ]; then
    echo "❌ ERROR: This script must be run from the project root directory"
    exit 1
fi

# Get DATABASE_URL from user
echo "Enter your Infomaniak MySQL database connection string:"
echo "Format: mysql://username:password@db-host.infomaniak.com:3306/database"
echo ""
read -p "DATABASE_URL: " DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL cannot be empty"
    exit 1
fi

# Validate DATABASE_URL format
if [[ ! "$DATABASE_URL" =~ ^mysql:// ]]; then
    echo "⚠️  WARNING: DATABASE_URL should start with 'mysql://'"
    read -p "Continue anyway? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Encode to base64
DATABASE_URL_BASE64=$(echo -n "$DATABASE_URL" | base64)

echo ""
echo "✅ Creating k8s/secret.yaml..."

# Create secret.yaml from template
cat > k8s/secret.yaml <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: ticketer-secret
  namespace: ticketer
  labels:
    app: ticketer
type: Opaque
data:
  DATABASE_URL: $DATABASE_URL_BASE64
EOF

echo "✅ Secret file created: k8s/secret.yaml"
echo ""
echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "   1. The file k8s/secret.yaml contains sensitive data"
echo "   2. It is already in .gitignore and will NOT be committed to git"
echo "   3. Store this file securely and do not share it"
echo "   4. You can now apply it with: kubectl apply -f k8s/secret.yaml"
echo ""
echo "To verify the secret after applying to Kubernetes:"
echo "   kubectl get secret ticketer-secret -n ticketer"
echo ""
echo "To decode the secret (for verification only):"
echo "   kubectl get secret ticketer-secret -n ticketer -o jsonpath='{.data.DATABASE_URL}' | base64 -d"
echo ""
echo "=========================================="
echo "Done!"
echo "=========================================="
