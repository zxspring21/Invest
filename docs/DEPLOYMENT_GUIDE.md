# 部署指南

## 概述

本指南將幫助您部署 Invest Trading Platform 到生產環境。平台包含以下組件：

- 後端 API 服務 (Node.js + Express)
- 前端 Web 應用 (React + TypeScript)
- 移動端應用 (React Native)
- 資料庫 (PostgreSQL + Redis)
- 反向代理 (Nginx)
- 監控系統 (Prometheus + Grafana)

## 系統要求

### 最低硬體要求

**開發環境：**
- CPU: 2 cores
- RAM: 4GB
- 存儲: 20GB SSD
- 網路: 100 Mbps

**生產環境：**
- CPU: 4+ cores
- RAM: 8GB+
- 存儲: 100GB+ SSD
- 網路: 1 Gbps

### 軟體要求

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+
- Git

## 部署選項

### 1. Docker Compose 部署（推薦）

這是最簡單的部署方式，適合中小型應用。

#### 步驟 1: 克隆專案

```bash
git clone https://github.com/your-org/invest-trading-platform.git
cd invest-trading-platform
```

#### 步驟 2: 配置環境變數

```bash
# 複製環境變數模板
cp server/env.example server/.env
cp client/.env.example client/.env

# 編輯環境變數
nano server/.env
nano client/.env
```

**重要的環境變數：**

```bash
# 服務器配置
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# 資料庫配置
DB_HOST=postgres
DB_PORT=5432
DB_NAME=invest_trading
DB_USER=postgres
DB_PASSWORD=your-secure-password

# Redis 配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# 外部 API 密鑰
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-api-key
FINNHUB_API_KEY=your-finnhub-api-key
IEX_CLOUD_API_KEY=your-iex-cloud-api-key

# 前端配置
REACT_APP_API_URL=https://your-domain.com/api
REACT_APP_WS_URL=wss://your-domain.com/socket.io
```

#### 步驟 3: 啟動服務

```bash
# 構建並啟動所有服務
docker-compose up -d

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f
```

#### 步驟 4: 初始化資料庫

```bash
# 等待資料庫啟動
sleep 30

# 運行資料庫遷移
docker-compose exec server npm run db:migrate

# 創建初始數據
docker-compose exec server npm run db:seed
```

### 2. Kubernetes 部署

適合大型生產環境和需要高可用性的場景。

#### 步驟 1: 準備 Kubernetes 集群

```bash
# 使用 kubectl 連接到集群
kubectl config use-context your-cluster

# 創建命名空間
kubectl create namespace invest-trading
```

#### 步驟 2: 部署資料庫

```yaml
# postgres-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: invest-trading
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: invest_trading
        - name: POSTGRES_USER
          value: postgres
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: invest-trading
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

#### 步驟 3: 部署應用程式

```yaml
# app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: invest-server
  namespace: invest-trading
spec:
  replicas: 3
  selector:
    matchLabels:
      app: invest-server
  template:
    metadata:
      labels:
        app: invest-server
    spec:
      containers:
      - name: server
        image: your-registry/invest-server:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: production
        - name: DB_HOST
          value: postgres
        - name: REDIS_HOST
          value: redis
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 3. 雲端平台部署

#### AWS 部署

**使用 AWS ECS：**

```bash
# 創建 ECS 集群
aws ecs create-cluster --cluster-name invest-trading

# 創建任務定義
aws ecs register-task-definition --cli-input-json file://task-definition.json

# 創建服務
aws ecs create-service --cluster invest-trading --service-name invest-server --task-definition invest-server:1 --desired-count 3
```

**使用 AWS EKS：**

```bash
# 創建 EKS 集群
eksctl create cluster --name invest-trading --region us-west-2 --nodes 3

# 部署應用程式
kubectl apply -f k8s/
```

#### Google Cloud 部署

**使用 Google Kubernetes Engine：**

```bash
# 創建 GKE 集群
gcloud container clusters create invest-trading --num-nodes=3 --zone=us-central1-a

# 部署應用程式
kubectl apply -f k8s/
```

#### Azure 部署

**使用 Azure Kubernetes Service：**

```bash
# 創建 AKS 集群
az aks create --resource-group invest-trading --name invest-trading --node-count 3 --enable-addons monitoring

# 部署應用程式
kubectl apply -f k8s/
```

## 域名和 SSL 配置

### 1. 域名配置

```bash
# 配置 DNS 記錄
# A 記錄: your-domain.com -> 服務器 IP
# CNAME 記錄: www.your-domain.com -> your-domain.com
# CNAME 記錄: api.your-domain.com -> your-domain.com
```

### 2. SSL 證書

**使用 Let's Encrypt：**

```bash
# 安裝 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 獲取證書
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自動續期
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

**使用 Cloudflare：**

```bash
# 在 Cloudflare 控制台中啟用 SSL/TLS
# 設置為 "Full (strict)" 模式
```

## 監控和日誌

### 1. 應用程式監控

**使用 Prometheus + Grafana：**

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'invest-server'
    static_configs:
      - targets: ['server:3001']
    metrics_path: '/metrics'
    scrape_interval: 5s
```

### 2. 日誌管理

**使用 ELK Stack：**

```yaml
# docker-compose.logging.yml
version: '3.8'
services:
  elasticsearch:
    image: elasticsearch:7.14.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"

  logstash:
    image: logstash:7.14.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

  kibana:
    image: kibana:7.14.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
```

### 3. 錯誤追蹤

**使用 Sentry：**

```javascript
// 在應用程式中集成 Sentry
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: process.env.NODE_ENV,
});
```

## 備份和恢復

### 1. 資料庫備份

```bash
# 創建備份腳本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="invest_trading"

# 創建備份
docker-compose exec postgres pg_dump -U postgres $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# 壓縮備份
gzip $BACKUP_DIR/backup_$DATE.sql

# 刪除舊備份（保留 30 天）
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

### 2. 自動備份

```bash
# 添加到 crontab
0 2 * * * /path/to/backup-script.sh
```

## 安全配置

### 1. 防火牆配置

```bash
# UFW 配置
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. SSL/TLS 配置

```nginx
# nginx SSL 配置
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

### 3. 安全標頭

```nginx
# 安全標頭
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

## 性能優化

### 1. 快取配置

```nginx
# Nginx 快取配置
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 2. 資料庫優化

```sql
-- 創建索引
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_symbol ON orders(symbol);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
```

### 3. 應用程式優化

```javascript
// 啟用 gzip 壓縮
app.use(compression());

// 設置快取標頭
app.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=31536000');
  next();
});
```

## 故障排除

### 1. 常見問題

**服務無法啟動：**
```bash
# 檢查日誌
docker-compose logs service-name

# 檢查端口占用
netstat -tulpn | grep :3001
```

**資料庫連接失敗：**
```bash
# 檢查資料庫狀態
docker-compose exec postgres pg_isready -U postgres

# 檢查網路連接
docker-compose exec server ping postgres
```

**SSL 證書問題：**
```bash
# 檢查證書
openssl x509 -in /path/to/cert.pem -text -noout

# 測試 SSL 連接
openssl s_client -connect your-domain.com:443
```

### 2. 監控和警報

**設置警報：**
```yaml
# alertmanager.yml
route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
- name: 'web.hook'
  webhook_configs:
  - url: 'http://your-webhook-url'
```

## 維護和更新

### 1. 定期維護

```bash
# 更新系統包
sudo apt update && sudo apt upgrade -y

# 清理 Docker 資源
docker system prune -a

# 重啟服務
docker-compose restart
```

### 2. 應用程式更新

```bash
# 拉取最新代碼
git pull origin main

# 重新構建和部署
docker-compose build
docker-compose up -d

# 運行資料庫遷移
docker-compose exec server npm run db:migrate
```

## 聯繫和支持

### 技術支持

- 電子郵件: devops@invest-platform.com
- 文檔: https://docs.invest-platform.com
- 問題追蹤: https://github.com/your-org/invest-trading-platform/issues

### 緊急聯繫

- 24/7 支持熱線: +1-800-INVEST-1
- 緊急郵件: emergency@invest-platform.com
