# Deploying to a VPS (DigitalOcean / Lightsail / any Ubuntu box)

One-time setup below. After this, redeploying a code change is just
`./deploy/deploy.sh` (see the bottom of this file).

Estimated time: 45–60 minutes. Estimated cost: ~$4–6/month for the smallest
droplet/instance size (1 vCPU, 1GB RAM is plenty for this app).

---

## 0. Create the server

- **DigitalOcean**: create a Droplet — Ubuntu 22.04 LTS, smallest size ($4-6/mo), add your SSH key at creation time.
- **AWS Lightsail**: create an instance — "Linux/Unix" → "OS Only" → Ubuntu 22.04, smallest plan, attach your SSH key.

Either way you'll end up with: an IP address, and SSH access as `root`.

## 1. First login and a non-root user

```bash
ssh root@YOUR_SERVER_IP
adduser deploy
usermod -aG sudo deploy
```

Log out and back in as `deploy` from here on (`ssh deploy@YOUR_SERVER_IP`).
Running everything as `root` day-to-day is avoidable risk for no benefit.

## 2. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

This is what actually keeps port 3000 (the Node backend) private — it's
only ever reached via nginx's internal proxy, never from the internet directly.

## 3. Install Node.js, nginx, PM2, certbot

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git
sudo npm install -g pm2
sudo apt-get install -y certbot python3-certbot-nginx
```

## 4. Get the code onto the server

```bash
sudo mkdir -p /var/www/pandian-hotel
sudo chown deploy:deploy /var/www/pandian-hotel
git clone <YOUR_GIT_REMOTE_URL> /var/www/pandian-hotel
cd /var/www/pandian-hotel
```

(If the project isn't in a git remote yet, `git init` it locally, push to a
private GitHub/GitLab repo, then clone that URL here — that's also what
`deploy/deploy.sh` uses to update later.)

## 5. Configure the backend

```bash
cd /var/www/pandian-hotel/backend
cp .env.example .env
nano .env
```

Set, at minimum:
```
ADMIN_PASSWORD=<a real password — not the local demo one>
PORT=3000
CORS_ORIGIN=https://YOUR_DOMAIN
```

**Do not reuse the local demo password (`pandian@2026`) here.** That one is
meant for your laptop only.

```bash
npm ci --omit=dev
```

## 6. Build the frontend

```bash
cd /var/www/pandian-hotel/frontend
npm ci
npm run build
```

This produces `frontend/dist/` — the exact static files nginx will serve.
Re-run this any time frontend code changes (`deploy/deploy.sh` does it for you).

## 7. Start the backend with PM2

```bash
cd /var/www/pandian-hotel
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup   # prints one command — copy/paste and run it, so PM2
              # (and this app) restart automatically if the server reboots
```

Check it's alive: `pm2 status` and `curl http://127.0.0.1:3000/api/rooms`.

## 8. Configure nginx

```bash
sudo cp /var/www/pandian-hotel/deploy/nginx.conf /etc/nginx/sites-available/pandian-hotel
sudo nano /etc/nginx/sites-available/pandian-hotel   # replace YOUR_DOMAIN
sudo ln -s /etc/nginx/sites-available/pandian-hotel /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default   # the placeholder "Welcome to nginx" site
sudo nginx -t
sudo systemctl reload nginx
```

At this point `http://YOUR_DOMAIN` (or `http://YOUR_SERVER_IP` if no domain
yet) should show the site over plain HTTP.

## 9. HTTPS (do this — it's free and automatic)

Requires a domain name pointed at the server's IP (an A record) first.

```bash
sudo certbot --nginx -d YOUR_DOMAIN
```

Certbot edits the nginx config to add the `443 ssl` block and the
80→443 redirect, and sets up auto-renewal. Answer its prompts (email,
agree to terms, redirect HTTP to HTTPS = yes).

## 10. Verify everything

- [ ] `https://YOUR_DOMAIN` loads the home page, images load
- [ ] Browse rooms, check availability, complete a test booking end-to-end
- [ ] `https://YOUR_DOMAIN/#/admin` shows the sign-in gate (not the panel directly)
- [ ] Sign in with the **real** `ADMIN_PASSWORD` you set in step 5
- [ ] `curl https://YOUR_DOMAIN/api/admin/summary` → `401` without a token (confirms the gate holds over the public internet, not just locally)

---

## Redeploying after a code change

```bash
cd /var/www/pandian-hotel
./deploy/deploy.sh
```

This pulls, rebuilds, and reloads the backend with zero downtime.

## Backing up guest data

Bookings live in `backend/data/bookings.json` on this server's disk — that
file **is** your database. Back it up:

```bash
# Run this on your own machine, not the server, to pull a copy down:
scp deploy@YOUR_SERVER_IP:/var/www/pandian-hotel/backend/data/bookings.json ./backup-$(date +%F).json
```

Consider a daily cron job on the server that copies it into a dated backups
folder, and/or syncs it off-box (e.g. to S3 or your own machine) — a single
disk failure currently has no recovery path otherwise.

## When you outgrow the JSON file

`bookings.json` is genuinely fine at small scale (a few dozen bookings a
day, one process). If this hotel grows, or you add a second server for
redundancy, the next step is swapping it for SQLite (same VPS, same disk,
just proper concurrent-write safety) or a hosted Postgres — ask and I'll do
that migration when it's actually needed rather than now.
