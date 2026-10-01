# 🚀 Full Deployment Guide — Step by Step

This guide walks you through deploying your webAuth project from zero to live. Follow each phase in order.

---

## Phase 1: Docker Hub Setup

You need a Docker Hub account to store your backend Docker images.

### Step 1.1 — Create a Docker Hub Account

1. Go to [https://hub.docker.com/signup](https://hub.docker.com/signup)
2. Sign up with a username, email, and password
3. Verify your email

### Step 1.2 — Create an Access Token

You need a token (not your password) for GitHub Actions to push images.

1. Log in to Docker Hub
2. Click your **profile icon** (top right) → **Account settings**
3. Go to **Security** → **Personal access tokens**
4. Click **Generate new token**
5. Give it a description like `github-actions-webauth`
6. Set access permissions to **Read & Write**
7. Click **Generate**
8. **Copy the token immediately** — you won't see it again

> [!IMPORTANT]
> Save this token somewhere safe temporarily. You'll enter it as a GitHub Secret in Phase 3.

Note down:
- **Docker Hub username**: (e.g., `flyingsakura`)
- **Docker Hub access token**: (the token you just copied)

---

## Phase 2: AWS EC2 Setup

### Step 2.1 — Launch an EC2 Instance

1. Go to **AWS Console** → **EC2** → **Launch instance**
2. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `webauth-backend` |
| **AMI** | Ubuntu Server 22.04 LTS (Free Tier eligible) |
| **Instance type** | `t2.micro` (Free Tier) or `t3.micro` |
| **Key pair** | Create a new key pair → name it `webauth-key` → download the `.pem` file |
| **Network settings** | Allow SSH from your IP |
| **Storage** | 8 GB gp3 (default is fine) |

3. Click **Launch instance**

### Step 2.2 — Configure Security Group (Firewall)

Your backend needs port 5000 open to receive API requests.

1. Go to **EC2** → **Instances** → click your instance
2. Scroll to **Security** tab → click the **Security group** link
3. Click **Edit inbound rules** → **Add rule**:

| Type | Port Range | Source | Description |
|------|-----------|--------|-------------|
| SSH | 22 | My IP | SSH access |
| Custom TCP | 5000 | `0.0.0.0/0` | Backend API |

4. Click **Save rules**

### Step 2.3 — SSH Into Your Instance

Find your instance's **Public IPv4 address** from the EC2 dashboard (e.g., `54.123.45.67`).

```bash
# On your local machine (from the folder where you downloaded the .pem file)
chmod 400 webauth-key.pem
ssh -i webauth-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
```

On Windows (PowerShell):
```powershell
ssh -i webauth-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
```

> [!NOTE]
> If you get a permissions error on Windows, right-click the `.pem` file → Properties → Security → Advanced → Disable inheritance → Remove all users except your own account.

### Step 2.4 — Install Docker on EC2

Once you're SSH'd into the instance, run these commands:

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io

# Start Docker and enable it on boot
sudo systemctl enable docker
sudo systemctl start docker

# Add your user to the docker group (so you don't need sudo for docker)
sudo usermod -aG docker $USER

# IMPORTANT: Log out and back in for the group change to take effect
exit
```

Now SSH back in:
```bash
ssh -i webauth-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
```

Verify Docker is working:
```bash
docker --version
# Should output something like: Docker version 24.x.x

docker run hello-world
# Should print "Hello from Docker!"
```

### Step 2.5 — Get Your SSH Private Key Content

You'll need the contents of your `.pem` file for GitHub Secrets. On your **local machine**:

```bash
cat webauth-key.pem
```

Copy the **entire output** including the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines. You'll paste this into GitHub Secrets next.

---

## Phase 3: GitHub Repository & Secrets

### Step 3.1 — Push Your Code to GitHub

If you haven't already created a GitHub repo:

```bash
cd c:\webAuth

# Initialize git (if not already)
git init

# Add all files
git add .

# Make sure .env is NOT being tracked
git status
# You should NOT see backend/.env in the list. If you do, run:
# git rm --cached backend/.env

# Commit
git commit -m "Add Dockerization and CI/CD pipeline"

# Create repo on GitHub (via browser), then:
git remote add origin https://github.com/<YOUR_USERNAME>/webAuth.git
git branch -M main
git push -u origin main
```

> [!CAUTION]
> Before pushing, double-check that `backend/.env` is NOT staged. It contains your real MongoDB, Redis, and SMTP credentials. The `.gitignore` should exclude it, but verify with `git status`.

### Step 3.2 — Configure GitHub Secrets

1. Go to your repo on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each of the following:

Add them **one by one** — click "New repository secret", enter the name and value, click "Add secret":

#### Docker Hub Secrets
```
Name:  DOCKERHUB_USERNAME
Value: <your docker hub username>
```
```
Name:  DOCKERHUB_TOKEN
Value: <the access token from Phase 1.2>
```

#### EC2 Connection Secrets
```
Name:  EC2_HOST
Value: <your EC2 public IP, e.g., 54.123.45.67>
```
```
Name:  EC2_USER
Value: ubuntu
```
```
Name:  EC2_SSH_KEY
Value: <entire contents of webauth-key.pem, including BEGIN/END lines>
```

#### Application Secrets
```
Name:  PORT
Value: 5000
```
```
Name:  MONGO_URI
Value: mongodb+srv://flyingsakura4_db_user:8BH79G4jeg60kadt@cluster0.afjsczg.mongodb.net/MernAuth?appName=Cluster0
```
```
Name:  REDIS_URL
Value: rediss://default:gQAAAAAAAfMSAAIgcDFmYjc1MTJlNDNjNmY0NzZhYTc0MjYwNjViZTY5ZGZkNw@eminent-bulldog-127762.upstash.io:6379
```
```
Name:  FRONTEND_URL
Value: http://localhost:5173
```
*(You'll update this to your Amplify URL after Phase 5)*

```
Name:  SMTP_USER
Value: flyingsakura4@gmail.com
```
```
Name:  SMTP_PASSWORD
Value: fdjo kpqp tkik eopm
```
```
Name:  JWT_SECRET
Value: <a strong random string — generate one with: openssl rand -hex 32>
```
```
Name:  REFRESH_SECRET
Value: <a different strong random string — generate one with: openssl rand -hex 32>
```

> [!TIP]
> Generate strong secrets on your local machine:
> ```bash
> openssl rand -hex 32
> ```
> Run it twice — once for `JWT_SECRET`, once for `REFRESH_SECRET`.

When done, you should have **13 secrets** listed on the Secrets page.

---

## Phase 4: Trigger the First Deployment

### Step 4.1 — Push to Main

The CI/CD pipeline triggers automatically on push to `main`. If you already pushed in Step 3.1, it's already running! If not:

```bash
git add .
git commit -m "Trigger first CI/CD deployment"
git push origin main
```

### Step 4.2 — Monitor the Pipeline

1. Go to your GitHub repo → **Actions** tab
2. You should see a workflow run in progress called **"CI/CD Pipeline"**
3. Click on it to watch the progress

You'll see two jobs:

```
CI — Install, Lint, Build    ⏳ (runs first)
CD — Deploy Backend to EC2   ⏳ (runs after CI passes)
```

Click on each job to expand the steps and see real-time logs.

**The CI job** will:
- Install backend dependencies
- Install frontend dependencies
- Run `npm run lint` on the frontend
- Run `npm run build` on the frontend

**The CD job** (only after CI passes) will:
- Log in to Docker Hub
- Build your Docker image
- Push it to Docker Hub
- SSH into your EC2
- Pull the image, stop the old container, start a new one

### Step 4.3 — Verify the Backend is Running

After the pipeline completes (usually 3–5 minutes), verify:

**From your browser:**
```
http://<YOUR_EC2_PUBLIC_IP>:5000/api/v1
```
You should get a response (likely a 404 or route listing — that's fine, it means the server is running).

**SSH into EC2 and check:**
```bash
ssh -i webauth-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>

# Check if the container is running
docker ps

# You should see something like:
# CONTAINER ID   IMAGE                          STATUS          PORTS
# abc123def      youruser/webauth-backend:latest   Up 2 minutes    0.0.0.0:5000->5000/tcp

# Check the logs
docker logs webauth-backend

# You should see:
# Connecting to Redis...
# Redis is ready.
# Connected to Redis
# Connected to MongoDB
# Server is running on 0.0.0.0:5000
```

> [!WARNING]
> If `docker ps` shows no running container, check why it crashed:
> ```bash
> docker ps -a                    # shows stopped containers
> docker logs webauth-backend     # shows error output
> ```
> Common issues: wrong MongoDB URI, Redis URL, or missing env vars.

---

## Phase 5: AWS Amplify Frontend Deployment

### Step 5.1 — Create an Amplify App

1. Go to **AWS Console** → search **AWS Amplify** → **Create new app**
2. Select **GitHub** as the source → click **Next**
3. Authorize AWS Amplify to access your GitHub account (if first time)
4. Select your repository (`webAuth`) and branch (`main`)
5. Click **Next**

### Step 5.2 — Configure Build Settings

Amplify will auto-detect it's a Vite/React app. You need to set the **monorepo** root:

1. Check **"My app is a monorepo"**
2. Set the **Monorepo root directory** to: `frontend`
3. The build settings should auto-populate. Verify they look like this:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

4. Click **Next**

### Step 5.3 — Add the Backend URL Environment Variable

Before deploying, add the environment variable that tells your frontend where the backend lives:

1. On the review page, expand **Advanced settings** → **Environment variables**
2. Add:

| Variable | Value |
|----------|-------|
| `VITE_SERVER_URL` | `http://<YOUR_EC2_PUBLIC_IP>:5000` |

3. Click **Save and deploy**

### Step 5.4 — Wait for Deployment

Amplify will:
1. Clone your repo
2. Run `npm ci` in the `frontend/` directory
3. Run `npm run build` (which bakes `VITE_SERVER_URL` into the static bundle)
4. Deploy the `dist/` output to a CDN

This takes 2–4 minutes. When done, you'll see a green checkmark and a URL like:
```
https://main.d1a2b3c4d5.amplifyapp.com
```

### Step 5.5 — Update FRONTEND_URL and Redeploy Backend

Now that you have the Amplify URL, you need to tell the backend to allow CORS from it.

1. Go back to **GitHub → Settings → Secrets → Actions**
2. Click the **pencil icon** next to `FRONTEND_URL`
3. Update the value to your Amplify URL:
   ```
   https://main.d1a2b3c4d5.amplifyapp.com
   ```
   *(no trailing slash)*
4. Click **Update secret**

Now trigger a redeployment so the backend picks up the new CORS origin:

```bash
# You can either push a small change, or manually re-run the workflow:
# GitHub → Actions → latest successful run → "Re-run all jobs"
```

Or from your local machine:
```bash
git commit --allow-empty -m "Update FRONTEND_URL for production CORS"
git push origin main
```

This will re-run the full pipeline and restart the backend container with the correct `FRONTEND_URL`.

---

## Phase 6: Verify Everything End-to-End

### Step 6.1 — Test the Frontend

1. Open your Amplify URL in a browser: `https://main.d1a2b3c4d5.amplifyapp.com`
2. You should see the login/register page
3. Try registering a new account — the form should submit to your EC2 backend
4. Check your email for the verification OTP/link

### Step 6.2 — Troubleshooting Checklist

| Problem | Check |
|---------|-------|
| Frontend loads but API calls fail | Open browser DevTools → Network tab. Are requests going to your EC2 IP:5000? |
| CORS errors in console | Make sure `FRONTEND_URL` secret matches the Amplify URL exactly (including `https://`) |
| Backend container keeps crashing | SSH into EC2, run `docker logs webauth-backend` |
| Can't reach EC2 on port 5000 | Check EC2 Security Group has port 5000 open for `0.0.0.0/0` |
| Cookies not being set | For cross-origin cookies (Amplify HTTPS → EC2 HTTP), you may need HTTPS on EC2 too. See note below. |
| GitHub Actions fails at SSH step | Verify `EC2_HOST`, `EC2_USER`, and `EC2_SSH_KEY` secrets are correct |
| Docker build fails | Check the Actions log — usually a dependency issue |

> [!WARNING]
> **Cookie/HTTPS Issue**: Your backend sets cookies with `secure: true` and `sameSite: "none"` in production. This requires the backend to be served over **HTTPS**. If you're running plain HTTP on EC2, cookies won't be set by the browser. You have two options:
> 1. **Quick fix**: Set up an Elastic IP + a domain + free SSL via Let's Encrypt with Nginx as a reverse proxy on EC2
> 2. **Alternative**: Use AWS CloudFront in front of your EC2 to terminate HTTPS

---

## Quick Reference: Day-to-Day Workflow

After initial setup, your daily workflow is simply:

```bash
# Make changes locally
git add .
git commit -m "your changes"
git push origin main
```

That's it. GitHub Actions will automatically:
1. ✅ Lint and build the frontend
2. 🐳 Build a new Docker image
3. 📦 Push it to Docker Hub
4. 🖥️ SSH into EC2, pull the new image, restart the container

Amplify will independently:
1. Detect the push
2. Rebuild and redeploy the frontend

**Both deployments happen in parallel, automatically, on every push to `main`.**

---

## Architecture Recap

```
You push to GitHub main
        │
        ├──────────────────────────────────┐
        │                                  │
        ▼                                  ▼
  GitHub Actions                     AWS Amplify
  ┌────────────┐                  ┌──────────────┐
  │ CI: lint,  │                  │ npm ci       │
  │ build      │                  │ npm run build│
  │     │      │                  │ Deploy dist/ │
  │     ▼      │                  │ to CDN       │
  │ CD: docker │                  └──────┬───────┘
  │ build+push │                         │
  │     │      │                         ▼
  │ SSH → EC2  │               Frontend live at
  │ pull+run   │            amplifyapp.com
  └─────┬──────┘
        │
        ▼
   EC2 Container
   ┌─────────────┐
   │ Node/Express │──── MongoDB Atlas
   │ :5000        │──── Upstash Redis
   └─────────────┘
```
