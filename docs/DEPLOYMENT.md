# IronLog Deployment Guide

## Initial Deployment to Synology NAS

### Prerequisites
- Synology NAS with Docker installed (via Package Center)
- SSH access to your NAS enabled
- Git installed on NAS (optional, for easier updates)

---

## Part 1: Backup Your Local Data

### 1.1 Export PostgreSQL Database

While your local development environment is running:

```bash
# From your Windows machine (PowerShell)
cd c:\code\IronLog

# Export the database to a SQL dump file
docker exec ironlog-db pg_dump -U ironlog_user -d ironlog_db > backup.sql
```

This creates a `backup.sql` file containing all your workout data.

### 1.2 Verify the Backup

```bash
# Check that the backup file exists and has content
ls -lh backup.sql
```

The file should be several KB in size if you have workout data.

---

## Part 2: Prepare for Deployment

### 2.1 Create Production Environment File

Create a `.env.production` file with your NAS-specific settings:

```bash
# Database
POSTGRES_USER=ironlog_user
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=ironlog_db

# Server
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://ironlog_user:your_secure_password_here@db:5432/ironlog_db

# Client (if needed)
VITE_API_URL=http://your-nas-ip:3001
```

**Important:** Use a strong password for production!

### 2.2 Create Production Docker Compose File

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    container_name: ironlog-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER}']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - ironlog

  api:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: ironlog-api
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: ${DATABASE_URL}
    ports:
      - "3001:3001"
    depends_on:
      db:
        condition: service_healthy
    networks:
      - ironlog

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    container_name: ironlog-client
    restart: unless-stopped
    ports:
      - "5173:80"
    networks:
      - ironlog

volumes:
  postgres_data:

networks:
  ironlog:
    driver: bridge
```

### 2.3 Create Server Dockerfile

Create `server/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "src/index.js"]
```

### 2.4 Create Client Dockerfile

Create `client/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build for production
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config (if you have custom config)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 2.5 Update Client API URL

Update `client/src/config.js` (create if doesn't exist):

```javascript
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

Then update your API calls to use this config instead of hardcoded URLs.

---

## Part 3: Transfer to Synology NAS

### 3.1 Create Project Directory on NAS

SSH into your NAS:

```bash
ssh your-username@your-nas-ip
```

Create the project directory:

```bash
mkdir -p /volume1/docker/ironlog
cd /volume1/docker/ironlog
```

### 3.2 Transfer Files to NAS

From your Windows machine, use `scp` or WinSCP to transfer files:

**Option A: Using SCP (Git Bash on Windows)**

```bash
cd c:\code\IronLog

# Transfer the entire project (excluding node_modules)
scp -r server/ your-username@your-nas-ip:/volume1/docker/ironlog/
scp -r client/ your-username@your-nas-ip:/volume1/docker/ironlog/
scp docker-compose.prod.yml your-username@your-nas-ip:/volume1/docker/ironlog/docker-compose.yml
scp .env.production your-username@your-nas-ip:/volume1/docker/ironlog/.env
scp backup.sql your-username@your-nas-ip:/volume1/docker/ironlog/
```

**Option B: Using Git (Recommended)**

On your NAS:

```bash
cd /volume1/docker/ironlog
git clone https://github.com/yourusername/ironlog.git .
```

Then copy your `.env.production` and `backup.sql`:

```bash
scp .env.production your-username@your-nas-ip:/volume1/docker/ironlog/.env
scp backup.sql your-username@your-nas-ip:/volume1/docker/ironlog/
```

---

## Part 4: Deploy on Synology NAS

### 4.1 Build and Start Containers

SSH into your NAS:

```bash
cd /volume1/docker/ironlog

# Build and start all services
docker-compose up -d --build
```

### 4.2 Wait for Database to Initialize

```bash
# Check if database is ready
docker-compose logs db | grep "ready to accept connections"
```

### 4.3 Restore Your Data

```bash
# Import your backup data
docker exec -i ironlog-db psql -U ironlog_user -d ironlog_db < backup.sql
```

### 4.4 Verify Deployment

Check that all containers are running:

```bash
docker-compose ps
```

All services should show "Up" status.

### 4.5 Test the Application

From your browser:
- Client: `http://your-nas-ip:5173`
- API: `http://your-nas-ip:3001/api/workouts/current`

Verify your workout history is intact.

---

## Part 5: Update/Publish Process

When you make changes locally and want to deploy to NAS:

### 5.1 Option A: Using Git (Recommended)

**On your development machine:**

```bash
cd c:\code\IronLog

# Commit your changes
git add .
git commit -m "Description of changes"
git push origin main
```

**On your NAS:**

```bash
cd /volume1/docker/ironlog

# Pull latest changes
git pull origin main

# Rebuild and restart containers
docker-compose down
docker-compose up -d --build

# If database schema changed, run migrations
docker-compose exec api node src/db/migrate.js
```

### 5.2 Option B: Manual Transfer

**On your development machine:**

```bash
cd c:\code\IronLog

# Create a tarball of your changes
tar -czf update.tar.gz server/ client/ docker-compose.prod.yml

# Transfer to NAS
scp update.tar.gz your-username@your-nas-ip:/volume1/docker/ironlog/
```

**On your NAS:**

```bash
cd /volume1/docker/ironlog

# Extract the update
tar -xzf update.tar.gz

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### 5.3 Database Schema Updates

If you've added migrations:

```bash
# On NAS
cd /volume1/docker/ironlog

# Run migrations
docker-compose exec api node src/db/migrate.js

# Or restart API to auto-run migrations (if configured)
docker-compose restart api
```

---

## Part 6: Backup Strategy on NAS

### 6.1 Automated Database Backups

Create a backup script on your NAS at `/volume1/docker/ironlog/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/volume1/docker/ironlog/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

docker exec ironlog-db pg_dump -U ironlog_user -d ironlog_db > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql"
```

Make it executable:

```bash
chmod +x /volume1/docker/ironlog/backup.sh
```

### 6.2 Schedule Automatic Backups

Using Synology Task Scheduler:
1. Open Control Panel → Task Scheduler
2. Create → Scheduled Task → User-defined script
3. General: Name it "IronLog DB Backup"
4. Schedule: Daily at 2:00 AM
5. Task Settings: User-defined script: `/volume1/docker/ironlog/backup.sh`

---

## Part 7: Maintenance Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f client
docker-compose logs -f db
```

### Restart Services

```bash
# All services
docker-compose restart

# Specific service
docker-compose restart api
```

### Stop Everything

```bash
docker-compose down
```

### Start Everything

```bash
docker-compose up -d
```

### Rebuild After Changes

```bash
docker-compose up -d --build
```

### View Container Status

```bash
docker-compose ps
```

### Access Database Directly

```bash
docker exec -it ironlog-db psql -U ironlog_user -d ironlog_db
```

### Clean Up Old Images

```bash
docker image prune -a
```

---

## Part 8: Accessing from Android

### 8.1 Configure Static IP or DNS

On your Synology NAS:
1. Control Panel → Network → Network Interface
2. Set a static IP (e.g., `192.168.1.100`)

Or use Synology's hostname: `http://your-nas-name.local:5173`

### 8.2 Add to Android Home Screen

On your Android device:
1. Open Chrome
2. Navigate to `http://your-nas-ip:5173`
3. Tap the 3-dot menu → "Add to Home screen"
4. Name it "IronLog"

Now you have a native-like app icon!

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs

# Check if ports are already in use
netstat -tulpn | grep -E ':(5173|3001|5432)'
```

### Database connection errors

```bash
# Verify database is running and healthy
docker-compose ps db

# Check database logs
docker-compose logs db

# Test connection
docker-compose exec api node -e "require('./src/db/pool').query('SELECT NOW()').then(r => console.log(r.rows))"
```

### API not accessible

```bash
# Check if API container is running
docker-compose ps api

# Check API logs
docker-compose logs api

# Test from NAS terminal
curl http://localhost:3001/api/workouts/current
```

### Client shows blank page

```bash
# Check client logs
docker-compose logs client

# Verify build was successful
docker-compose exec client ls -la /usr/share/nginx/html
```

---

## Security Recommendations

1. **Use strong passwords** in `.env` file
2. **Enable HTTPS** using Synology's reverse proxy
3. **Restrict access** to your local network only (firewall rules)
4. **Regular backups** - follow Part 6
5. **Keep Docker images updated**:
   ```bash
   docker-compose pull
   docker-compose up -d --build
   ```

---

## Quick Reference

| Action | Command |
|--------|---------|
| Deploy | `docker-compose up -d --build` |
| Update | `git pull && docker-compose up -d --build` |
| Backup DB | `docker exec ironlog-db pg_dump -U ironlog_user -d ironlog_db > backup.sql` |
| Restore DB | `docker exec -i ironlog-db psql -U ironlog_user -d ironlog_db < backup.sql` |
| View logs | `docker-compose logs -f` |
| Restart | `docker-compose restart` |
| Stop | `docker-compose down` |
