# Invest Trading Platform - 快速開始指南

## 專案概述

Invest Trading Platform 是一個類似富途牛牛和 Moomoo 的綜合線上交易平台，支援即時股票報價、一站式投資交易和跨平台手機應用。

### 主要功能

- 🚀 **即時股票報價** - 實時市場數據和價格更新
- 💰 **零佣金交易** - 免佣金股票、ETF、期權交易
- 📊 **高級圖表工具** - 100+技術指標和繪圖工具
- 📱 **跨平台支援** - Web、iOS、Android全平台覆蓋
- 🔒 **安全可靠** - 銀行級安全保護和合規性
- 📈 **投資組合管理** - 完整的投資追蹤和分析
- 📰 **實時新聞** - 市場新聞和分析
- 🎯 **模擬交易** - 無風險的虛擬交易練習

## 技術架構

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Mobile Apps    │    │  Desktop App    │
│   (React)       │    │ (React Native)  │    │   (Electron)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Load Balancer │
                    │     (Nginx)     │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │  API Gateway    │
                    │   (Express)     │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │  External APIs  │
│   (Database)    │    │    (Cache)      │    │ (Market Data)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 快速開始

### 環境要求

- Node.js 18+
- Docker 20.10+
- Docker Compose 2.0+
- Git

### 1. 克隆專案

```bash
git clone https://github.com/your-org/invest-trading-platform.git
cd invest-trading-platform
```

### 2. 配置環境變數

```bash
# 複製環境變數模板
cp server/env.example server/.env
cp client/.env.example client/.env

# 編輯環境變數（重要：設置您的 API 密鑰）
nano server/.env
```

**必需的環境變數：**

```bash
# 資料庫配置
DB_PASSWORD=your-secure-password

# JWT 密鑰
JWT_SECRET=your-super-secret-jwt-key-here

# 外部 API 密鑰（獲取免費密鑰）
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-api-key
FINNHUB_API_KEY=your-finnhub-api-key
IEX_CLOUD_API_KEY=your-iex-cloud-api-key
```

### 3. 啟動開發環境

```bash
# 啟動所有服務
docker-compose up -d

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f
```

### 4. 初始化資料庫

```bash
# 等待資料庫啟動
sleep 30

# 運行資料庫遷移
docker-compose exec server npm run db:migrate

# 創建初始數據
docker-compose exec server npm run db:seed
```

### 5. 訪問應用程式

- **Web 應用**: http://localhost:3000
- **API 文檔**: http://localhost:3001/api-docs
- **監控面板**: http://localhost:3003 (Grafana)
- **健康檢查**: http://localhost:3001/health

## 開發指南

### 後端開發

```bash
# 進入後端目錄
cd server

# 安裝依賴
npm install

# 啟動開發服務器
npm run dev

# 運行測試
npm test

# 運行 linting
npm run lint
```

### 前端開發

```bash
# 進入前端目錄
cd client

# 安裝依賴
npm install

# 啟動開發服務器
npm start

# 構建生產版本
npm run build

# 運行測試
npm test
```

### 移動端開發

```bash
# 進入移動端目錄
cd mobile

# 安裝依賴
npm install

# iOS 開發
npm run ios

# Android 開發
npm run android

# 啟動 Metro bundler
npm start
```

## API 使用示例

### 認證

```javascript
// 用戶註冊
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securePassword123',
    username: 'trader123',
    firstName: 'John',
    lastName: 'Doe'
  })
});

// 用戶登入
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securePassword123'
  })
});
```

### 市場數據

```javascript
// 獲取股票報價
const quote = await fetch('/api/market/quote/AAPL', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 搜索股票
const searchResults = await fetch('/api/market/search?q=Apple', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 獲取圖表數據
const chartData = await fetch('/api/market/chart/AAPL?interval=1d&range=1M', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 交易

```javascript
// 創建訂單
const order = await fetch('/api/trading/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    symbol: 'AAPL',
    side: 'buy',
    type: 'market',
    quantity: 10,
    timeInForce: 'day'
  })
});

// 獲取投資組合
const portfolio = await fetch('/api/portfolio/overview', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## WebSocket 即時數據

```javascript
import io from 'socket.io-client';

// 連接到 WebSocket
const socket = io('http://localhost:3002', {
  auth: {
    token: 'your-jwt-token'
  }
});

// 認證
socket.emit('authenticate', { token: 'your-jwt-token' });

// 訂閱市場數據
socket.emit('subscribe_market_data', { symbols: ['AAPL', 'MSFT', 'GOOGL'] });

// 接收市場數據
socket.on('market_data', (data) => {
  console.log('Market data:', data);
  // 更新 UI
});

// 訂閱投資組合更新
socket.emit('subscribe_portfolio');

// 接收投資組合更新
socket.on('portfolio_update', (data) => {
  console.log('Portfolio update:', data);
  // 更新投資組合 UI
});
```

## 部署到生產環境

### 使用 Docker Compose

```bash
# 設置生產環境變數
export NODE_ENV=production

# 構建並啟動
docker-compose -f docker-compose.prod.yml up -d

# 設置 SSL 證書
sudo certbot --nginx -d your-domain.com
```

### 使用 Kubernetes

```bash
# 部署到 Kubernetes
kubectl apply -f k8s/

# 檢查部署狀態
kubectl get pods -n invest-trading

# 查看服務
kubectl get services -n invest-trading
```

## 獲取 API 密鑰

### Alpha Vantage
1. 訪問 [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
2. 註冊免費帳戶
3. 獲取 API 密鑰

### Finnhub
1. 訪問 [Finnhub](https://finnhub.io/register)
2. 註冊免費帳戶
3. 獲取 API 密鑰

### IEX Cloud
1. 訪問 [IEX Cloud](https://iexcloud.io/pricing/)
2. 註冊免費帳戶
3. 獲取 API 密鑰

## 常見問題

### Q: 如何重置資料庫？
```bash
docker-compose down -v
docker-compose up -d
docker-compose exec server npm run db:migrate
docker-compose exec server npm run db:seed
```

### Q: 如何查看應用程式日誌？
```bash
# 查看所有服務日誌
docker-compose logs -f

# 查看特定服務日誌
docker-compose logs -f server
docker-compose logs -f client
```

### Q: 如何更新應用程式？
```bash
git pull origin main
docker-compose build
docker-compose up -d
```

### Q: 如何備份資料庫？
```bash
docker-compose exec postgres pg_dump -U postgres invest_trading > backup.sql
```

## 技術支持

### 文檔
- [API 文檔](http://localhost:3001/api-docs)
- [部署指南](./docs/DEPLOYMENT_GUIDE.md)
- [App Store 上架指南](./docs/APP_STORE_GUIDE.md)

### 聯繫方式
- 電子郵件: support@invest-platform.com
- GitHub Issues: [提交問題](https://github.com/your-org/invest-trading-platform/issues)
- 文檔網站: https://docs.invest-platform.com

### 社群
- Discord: [加入我們的社群](https://discord.gg/invest-trading)
- Twitter: [@InvestTrading](https://twitter.com/InvestTrading)
- LinkedIn: [Invest Trading Platform](https://linkedin.com/company/invest-trading)

## 貢獻指南

我們歡迎所有形式的貢獻！

### 如何貢獻
1. Fork 這個專案
2. 創建您的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟一個 Pull Request

### 開發規範
- 遵循 ESLint 和 Prettier 配置
- 編寫單元測試
- 更新文檔
- 遵循 Git 提交訊息規範

## 授權

本專案採用 MIT 授權 - 詳見 [LICENSE](LICENSE) 文件。

## 免責聲明

本軟體僅供教育和開發目的使用。在生產環境中使用前，請確保：

1. 遵循所有適用的法律法規
2. 實施適當的安全措施
3. 獲得必要的金融服務許可證
4. 進行充分的測試和審計

投資有風險，請謹慎投資。

---

**開始您的交易平台開發之旅！** 🚀
