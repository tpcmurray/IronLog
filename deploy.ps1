# IronLog Deploy Script
# Deploys latest main branch to Synology NAS

$NAS_USER = "tpcmurray"
$NAS_HOST = "192.168.1.15"
$NAS_PORT = 11111
$APP_DIR = "/volume1/docker/ironlog/app"

Write-Host "Deploying IronLog to NAS..." -ForegroundColor Cyan

# SSH commands to run on NAS
$commands = @"
set -e
echo "Downloading latest from GitHub..."
curl -sL https://github.com/tpcmurray/IronLog/archive/refs/heads/main.tar.gz -o /tmp/ironlog.tar.gz
echo "Extracting..."
tar -xzf /tmp/ironlog.tar.gz -C /tmp/
echo "Backing up current compose file..."
cp $APP_DIR/docker-compose.yml /tmp/docker-compose.yml.bak
echo "Replacing app files..."
rm -rf $APP_DIR/server $APP_DIR/client $APP_DIR/db $APP_DIR/docs $APP_DIR/README.md $APP_DIR/client.Dockerfile
cp -r /tmp/IronLog-main/server $APP_DIR/
cp -r /tmp/IronLog-main/client $APP_DIR/
cp -r /tmp/IronLog-main/db $APP_DIR/
cp -r /tmp/IronLog-main/docs $APP_DIR/
cp /tmp/IronLog-main/client.Dockerfile $APP_DIR/
cp /tmp/IronLog-main/README.md $APP_DIR/
echo "Restoring NAS compose file..."
cp /tmp/docker-compose.yml.bak $APP_DIR/docker-compose.yml
echo "Fixing Dockerfiles for npm install..."
sed -i 's/npm ci --omit=dev/npm install --omit=dev/' $APP_DIR/server/Dockerfile
sed -i 's/npm ci/npm install/' $APP_DIR/client.Dockerfile
echo "Rebuilding containers..."
cd $APP_DIR
docker compose up -d --build
echo "Cleaning up..."
rm -rf /tmp/IronLog-main /tmp/ironlog.tar.gz /tmp/docker-compose.yml.bak
echo "Deploy complete!"
"@

ssh -p $NAS_PORT "$NAS_USER@$NAS_HOST" $commands

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deploy successful!" -ForegroundColor Green
} else {
    Write-Host "Deploy failed!" -ForegroundColor Red
    exit 1
}
