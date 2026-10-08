# ==============================================================================
# Multi-Stage Dockerfile for Terraform Provisioning Worker
# Sub-Phase 4.1.1: Execution image bundling Node.js runtime, Terraform CLI binary,
# and AWS/Azure/GCP client utilities.
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build TypeScript Worker & Prisma Client
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Install build prerequisites
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace configuration & prisma schema
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/
COPY backend/prisma ./backend/prisma

# Install dependencies
RUN npm ci --workspace=backend --workspace=shared

# Copy sources
COPY shared ./shared
COPY backend ./backend

# Generate Prisma client and compile
WORKDIR /app/backend
RUN npx prisma generate
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Provisioning Execution Runner with Cloud Tooling & Terraform CLI
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV TERRAFORM_WORKSPACE_DIR=/app/terraform_workspaces
ENV DEBIAN_FRONTEND=noninteractive
ENV TERRAFORM_VERSION=1.9.8

# Install foundational utilities, Python, OpenSSL, Git, jq, unzip, dumb-init
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    unzip \
    tar \
    git \
    openssh-client \
    ca-certificates \
    gnupg \
    lsb-release \
    jq \
    python3 \
    python3-pip \
    python3-venv \
    openssl \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# 1. Install Terraform CLI binary
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then TF_ARCH="amd64"; \
    elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then TF_ARCH="arm64"; \
    else TF_ARCH="amd64"; fi && \
    wget -q "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_${TF_ARCH}.zip" -O /tmp/terraform.zip && \
    unzip -q /tmp/terraform.zip -d /usr/local/bin/ && \
    rm /tmp/terraform.zip && \
    terraform --version

# 2. Install AWS CLI v2
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then AWS_ARCH="x86_64"; \
    elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then AWS_ARCH="aarch64"; \
    else AWS_ARCH="x86_64"; fi && \
    curl "https://awscli.amazonaws.com/awscli-exe-linux-${AWS_ARCH}.zip" -o "/tmp/awscliv2.zip" && \
    unzip -q /tmp/awscliv2.zip -d /tmp && \
    /tmp/aws/install && \
    rm -rf /tmp/aws /tmp/awscliv2.zip && \
    aws --version || true

# 3. Install Azure CLI
RUN mkdir -p /etc/apt/keyrings && \
    curl -sLS https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /etc/apt/keyrings/microsoft.gpg && \
    chmod go+r /etc/apt/keyrings/microsoft.gpg && \
    AZ_DIST=$(lsb_release -cs) && \
    echo "deb [arch=`dpkg --print-architecture` signed-by=/etc/apt/keyrings/microsoft.gpg] https://packages.microsoft.com/repos/azure-cli/ $AZ_DIST main" > /etc/apt/sources.list.d/azure-cli.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends azure-cli && \
    rm -rf /var/lib/apt/lists/* && \
    az --version || true

# 4. Install Google Cloud SDK CLI (gcloud)
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" > /etc/apt/sources.list.d/google-cloud-sdk.list && \
    curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg && \
    apt-get update && \
    apt-get install -y --no-install-recommends google-cloud-cli && \
    rm -rf /var/lib/apt/lists/* && \
    gcloud --version || true

# Create unprivileged runner user
RUN groupadd --system --gid 1001 workergroup && \
    useradd --system --uid 1001 -g workergroup -m -s /bin/bash workeruser

# Create workspace directory with permissions
RUN mkdir -p /app/terraform_workspaces && \
    chown -R workeruser:workergroup /app

# Copy application artifacts from builder
COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/templates ./templates
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/package.json ./package.json

RUN chown -R workeruser:workergroup /app

USER workeruser

# Execution command
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/workers/terraform.worker.js"]
