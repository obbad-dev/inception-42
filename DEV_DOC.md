# Developer Documentation

This guide explains how to set up, build, and manage the Inception project from a development perspective.

## Setting Up the Environment from Scratch

### Prerequisites

| Requirement | Purpose |
|-------------|---------|
| **Docker Engine** | Container runtime |
| **Docker Compose v2** | Multi-container orchestration |
| **make** | Build automation |
| **sudo privileges** | DNS configuration (`/etc/resolv.conf`) |

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd inception-42
```

### Step 2: Create Configuration Files

The project requires two sets of configuration files that are **not tracked by Git** (listed in `.gitignore`):

**Option A — Automatic setup (recommended):**

Just run `make`. The `setup.sh` script detects missing files and offers to create them with default test values or interactively.

**Option B — Manual creation:**

#### `srcs/.env` — Environment variables

```bash
cat > srcs/.env <<EOF
LOGIN=oualid
DOMAIN_NAME=oobbad.42.fr
MYSQL_DATABASE=inception_db
MYSQL_USER=inception_user
DB_HOST=mariadb
WP_URL=https://${DOMAIN_NAME}
WP_TITLE="My Inception Website"
WP_ADMIN_USER=oobbad
WP_ADMIN_EMAIL=oobbad@student.1337.ma
WP_USER=second_user
WP_USER_EMAIL=second@student.1337.ma
REDIS_HS=redis
FTP_USER=ftpuser
EOF
```

#### `secrets/` — Docker secrets (passwords)

```bash
mkdir -p secrets
echo -n "data123"  > secrets/db_password.txt
echo -n "1233"     > secrets/db_root_password.txt

cat > secrets/wp_credentials.txt <<EOF
DB_PASSWORD=data123
WP_ADMIN_PASSWORD=1233
WP_USER_PASSWORD=hello22
EOF

echo -n "FTP_PWD=ftp123" > secrets/ftp_credentials.txt
```

> **Important:** These files contain real passwords. Never commit them to Git.

## Building and Launching the Project

### Build and start

```bash
make
```

This runs the full chain: **setup → build → up**

1. `setup.sh` checks if `srcs/.env` and `secrets/` exist, creates missing files if needed.
2. Docker Compose builds all 8 container images from their respective Dockerfiles.
3. Data directories are created at `/home/<login>/data/wordpress` and `/home/<login>/data/mariadb`.
4. All containers start with proper dependency ordering (MariaDB → WordPress → NGINX).
5. DNS is locked to the local dnsmasq container.

### Build only (no start)

```bash
make build
```

### The Makefile Dependency Chain

```
make (all) → up → build → setup
```

- `setup`: Runs `setup.sh` to ensure config files exist
- `build`: Builds all Docker images via `docker compose build`
- `up`: Creates data directories, starts containers, configures DNS

## Managing Containers and Volumes

### Container Management

| Command | Description |
|---------|-------------|
| `make status` | Show running containers and health status |
| `make logs` | View logs from all containers |
| `make stop` | Stop containers without removing them |
| `make start` | Restart stopped containers |
| `make down` | Stop and remove containers, restore DNS |
| `make clean` | Remove containers, volumes, and all images |
| `make fclean` | Full purge: `clean` + `docker system prune` + delete data dirs |
| `make re` | Full rebuild: `fclean` then `make` |

### Direct Docker Compose Commands

All services are defined in `srcs/docker-compose.yml`. You can interact directly:

```bash
# View a specific service's logs
docker compose -f srcs/docker-compose.yml logs wordpress

# Open a shell in a container
docker exec -it wordpress bash
docker exec -it mariadb bash

# Restart a single service
docker compose -f srcs/docker-compose.yml restart redis
```

### Volume Management

The project uses two **bind-mount volumes**:

| Volume | Host Path | Container Mount | Used By |
|--------|-----------|-----------------|---------|
| `mariadb_data` | `/home/<login>/data/mariadb` | `/var/lib/mysql` | MariaDB |
| `wordpress_data` | `/home/<login>/data/wordpress` | `/var/www/html` | WordPress, NGINX, FTP |

These directories persist data across container restarts and rebuilds (`make down` / `make up`). They are only deleted by `make fclean`.

To inspect data:

```bash
# List WordPress files
ls -la /home/$(whoami)/data/wordpress/

# List MariaDB databases
ls -la /home/$(whoami)/data/mariadb/
```

## Project Data Storage and Persistence

### What persists across `make down` / `make up`

| Data | Location | Persists? |
|------|----------|-----------|
| WordPress files (themes, plugins, uploads) | `/home/<login>/data/wordpress/` | ✅ Yes |
| MariaDB database | `/home/<login>/data/mariadb/` | ✅ Yes |
| Configuration (`srcs/.env`, `secrets/`) | Project directory | ✅ Yes |
| Container images | Docker image cache | ✅ Yes (until `make clean`) |
| Redis cache | In-memory (inside container) | ❌ No (volatile by design) |

### What gets destroyed by each clean command

| Command | Containers | Images | Volumes | Data Dirs | Config |
|---------|-----------|--------|---------|-----------|--------|
| `make down` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `make clean` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `make fclean` | ✅ | ✅ | ✅ | ✅ | ❌ |

> **Note:** `srcs/.env` and `secrets/` are never deleted by any Makefile target. They must be removed manually if needed.

## Project Structure

```
inception-42/
├── Makefile                          # Build automation
├── setup.sh                          # First-run configuration script (gitignored)
├── .gitignore                        # Excludes .env, secrets/, setup.sh
├── README.md                         # Project overview
├── USER_DOC.md                       # User documentation
├── DEV_DOC.md                        # This file
├── secrets/                          # Docker secrets (gitignored)
│   ├── db_password.txt
│   ├── db_root_password.txt
│   ├── wp_credentials.txt
│   └── ftp_credentials.txt
└── srcs/
    ├── .env                          # Environment variables (gitignored)
    ├── docker-compose.yml            # Service orchestration
    └── requirements/
        ├── mariadb/
        │   ├── Dockerfile
        │   └── tools/mariadb.sh      # DB initialization script
        ├── nginx/
        │   ├── Dockerfile
        │   └── config/nginx.conf     # HTTPS + reverse proxy config
        ├── wordpress/
        │   ├── Dockerfile
        │   └── tools/wordpress.sh    # WP install + Redis config script
        └── bonus/
            ├── adminer/Dockerfile
            ├── dns/
            │   ├── Dockerfile
            │   └── conf/dnsmasq.conf
            ├── ftp/
            │   ├── Dockerfile
            │   └── tools/ftp.sh
            ├── redis/Dockerfile
            └── website/
                ├── Dockerfile
                └── site/             # Static website files
```

## Service Architecture

All containers connect over a single Docker bridge network (`inception-net`):

```
Host machine
│
├── Port 443 ──► NGINX (reverse proxy + TLS termination)
│                  ├── / ──────────► WordPress (PHP-FPM :9000)
│                  │                    ├──► MariaDB (:3306)
│                  │                    └──► Redis (:6379)
│                  ├── /adminer/ ──► Adminer (PHP-FPM :8080)
│                  └── /site/ ────► Website (Python HTTP :8000)
│
├── Port 21 ───► FTP (vsftpd, passive ports 6000-6010)
│
└── Port 53 ───► DNS (dnsmasq, bound to 127.0.0.1 only)
```

### Container Startup Order

Docker Compose enforces dependencies with health checks:

1. **MariaDB** starts first, passes health check (`mariadb-admin ping`)
2. **Redis** starts (no health check, just needs to be running)
3. **WordPress** starts after MariaDB is healthy and Redis is started, passes its own health check (`wp-config.php` exists)
4. **NGINX**, **Adminer**, **FTP** start after their dependencies are healthy
5. **DNS** and **Website** start independently
