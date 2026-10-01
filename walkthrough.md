# Dockerization & CI/CD Setup — Walkthrough

## Files Created / Modified

| File | Action | Purpose |
|------|--------|---------|
| [`backend/Dockerfile`](file:///c:/webAuth/backend/Dockerfile) | **Created** | Multi-stage production Dockerfile (Alpine, non-root user) |
| [`backend/.dockerignore`](file:///c:/webAuth/backend/.dockerignore) | **Created** | Excludes node_modules, .env, .git from Docker build |
| [`backend/.env.example`](file:///c:/webAuth/backend/.env.example) | **Created** | Documents all required backend env vars |
| [`frontend/.env.example`](file:///c:/webAuth/frontend/.env.example) | **Created** | Documents VITE_SERVER_URL for frontend |
| [`.github/workflows/ci-cd.yml`](file:///c:/webAuth/.github/workflows/ci-cd.yml) | **Created** | GitHub Actions CI/CD pipeline |
| [`.gitignore`](file:///c:/webAuth/.gitignore) | **Modified** | Added .env, node_modules, build artifacts, IDE files |
| [`backend/index.js`](file:///c:/webAuth/backend/index.js) | **Modified** | Changed `app.listen()` to bind on `0.0.0.0` |

> [!NOTE]
> No business logic was changed. The frontend's [`config.js`](file:///c:/webAuth/frontend/src/config.js) already reads `VITE_SERVER_URL` from env vars — no modifications needed there.

---

## GitHub Secrets to Configure

Go to **GitHub → Repository → Settings → Secrets and variables → Actions** and add these:

| Secret | Value |
|--------|-------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token ([create here](https://hub.docker.com/settings/security)) |
| `EC2_HOST` | EC2 public IP or domain (e.g., `54.123.45.67`) |
| `EC2_USER` | EC2 SSH user (typically `ubuntu` or `ec2-user`) |
| `EC2_SSH_KEY` | Full private SSH key for EC2 (paste entire PEM content) |
| `PORT` | `5000` |
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `REDIS_URL` | Your Upstash Redis URL |
| `FRONTEND_URL` | Your Amplify frontend URL (e.g., `https://main.d1234abcde.amplifyapp.com`) |
| `SMTP_USER` | Gmail address for sending emails |
| `SMTP_PASSWORD` | Gmail app password |
| `JWT_SECRET` | Strong random string for JWT signing |
| `REFRESH_SECRET` | Strong random string for refresh token signing |

---

## EC2 Setup Commands

Run these once on your EC2 instance:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker

# Add your user to docker group (avoids needing sudo for docker commands)
sudo usermod -aG docker $USER

# Log out and back in for group change to take effect
exit
# SSH back in

# Verify Docker works
docker --version
docker run hello-world

# Open port 5000 in your EC2 Security Group:
# AWS Console → EC2 → Security Groups → Inbound rules → Add:
#   Type: Custom TCP | Port: 5000 | Source: 0.0.0.0/0 (or your Amplify domain)
```

> [!IMPORTANT]
> Also open port **443** (HTTPS) if you plan to put a reverse proxy (nginx/Caddy) in front of the backend later. For production with cookies over HTTPS, you'll want a domain + SSL certificate on the EC2 instance.

---

## AWS Amplify Configuration

1. Go to **AWS Amplify Console** → **New app** → **Host web app**
2. Connect your **GitHub repository**
3. Set the following build settings:

| Setting | Value |
|---------|-------|
| **App root** | `frontend` |
| **Build command** | `npm run build` |
| **Output directory** | `dist` |
| **Node.js version** | `20` |

4. Add this **environment variable** in Amplify:

| Variable | Value |
|----------|-------|
| `VITE_SERVER_URL` | `http://<your-ec2-ip>:5000` (or your backend domain) |

5. Amplify `amplify.yml` (if needed — Amplify auto-detects Vite, but you can add this in the Amplify console build settings or as a file):

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

> [!TIP]
> Set the **App root** to `frontend` in the Amplify console so it runs builds from the `frontend/` subdirectory of your monorepo.

---

## How the CI/CD Flow Works

```text
Developer pushes to main (or opens PR)
         │
         ▼
┌─────────────────────────────────┐
│  GitHub Actions: CI Job         │
│  ├─ Install backend deps        │
│  ├─ Install frontend deps       │
│  ├─ Lint frontend (eslint)      │
│  └─ Build frontend (vite)       │
└──────────────┬──────────────────┘
               │ ✅ passes
               │ (only on push to main)
               ▼
┌─────────────────────────────────┐
│  GitHub Actions: CD Job         │
│  ├─ Log in to Docker Hub        │
│  ├─ Build backend Docker image  │
│  ├─ Push image (latest + SHA)   │
│  ├─ SSH into EC2                │
│  │   ├─ docker pull latest      │
│  │   ├─ stop old container      │
│  │   └─ start new container     │
│  │       (env vars from secrets)│
│  └─ Prune old images            │
└─────────────────────────────────┘

         ┌─────────────────────┐
         │  AWS Amplify        │
         │  (separate trigger) │
         │  ├─ Detects push    │
         │  ├─ npm ci          │
         │  ├─ npm run build   │
         │  └─ Deploys static  │
         │     frontend (dist) │
         └─────────────────────┘
```

**On pull requests:** Only the CI job runs (lint + build). No deployment happens.

**On push to main:** CI runs first → if it passes → CD builds the Docker image, pushes to Docker Hub, SSHs into EC2, pulls the new image, and restarts the container with all secrets injected as runtime environment variables.

**Frontend (Amplify):** Deploys independently. Amplify watches the `main` branch and auto-builds/deploys when it detects changes in `frontend/`. The `VITE_SERVER_URL` env var tells the React app where the backend lives.

**Security:** No secrets are baked into the Docker image or committed to git. The backend container receives all config through `-e` flags at runtime. The frontend gets `VITE_SERVER_URL` at build time through Amplify's environment variables.
