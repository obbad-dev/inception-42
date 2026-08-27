# User Documentation

This guide explains how to use the Inception infrastructure as an end user or administrator.

## What This Project Provides

Inception deploys a full web stack with the following services:

| Service | What It Does |
|---------|-------------|
| **WordPress** | Content management system for creating and managing a website |
| **MariaDB** | Database server that stores all WordPress content |
| **NGINX** | Web server that handles HTTPS and routes traffic to services |
| **Redis** | In-memory cache that speeds up WordPress page loads |
| **Adminer** | Web-based interface for viewing and managing the database |
| **FTP** | File transfer server for uploading files to WordPress |
| **DNS** | Local domain name resolver so `oobbad.42.fr` works on your machine |
| **Static Website** | A personal portfolio/resume site |

## Starting and Stopping the Project

### Start everything

```bash
make
```

This builds all containers (if not already built) and starts the entire stack. On first run, it will ask you to configure credentials.

### Stop containers (keep data)

```bash
make stop
```

Containers are paused. Your data and configuration remain intact. Resume with `make start`.

### Start stopped containers

```bash
make start
```

### Shut down and remove containers

```bash
make down
```

Containers are removed. Data on disk (`/home/<login>/data/`) is preserved. DNS is restored to normal.

### Full cleanup

```bash
make fclean
```

Removes everything: containers, images, volumes, and data directories. You will need to run `make` again to rebuild.

## Accessing the Services

> **Important:** All services are accessed through NGINX on port 443 (HTTPS). Since the SSL certificate is self-signed, your browser will show a security warning — this is expected. Accept the warning to proceed.

| What | URL |
|------|-----|
| WordPress site | [https://oobbad.42.fr](https://oobbad.42.fr) |
| WordPress admin panel | [https://oobbad.42.fr/wp-admin](https://oobbad.42.fr/wp-admin) |
| Adminer (database UI) | [https://oobbad.42.fr/adminer/](https://oobbad.42.fr/adminer/) |
| Static website | [https://oobbad.42.fr/website/](https://oobbad.42.fr/website/) |
| FTP server | `ftp://oobbad.42.fr` (port 21, use an FTP client) |

### Logging into WordPress Admin

Use the WordPress admin credentials configured during setup:
- **Username:** The value of `WP_ADMIN_USER` (default: `oobbad`)
- **Password:** The value of `WP_ADMIN_PASSWORD` from `secrets/wp_credentials.txt` (default: `1233`)

### Logging into Adminer

- **Server:** `mariadb`
- **Username:** The value of `MYSQL_USER` (default: `inception_user`)
- **Password:** The value in `secrets/db_password.txt` (default: `data123`)
- **Database:** The value of `MYSQL_DATABASE` (default: `inception_db`)

### Connecting via FTP

Use any FTP client (e.g., FileZilla, `lftp`, or command-line `ftp`):
- **Host:** `oobbad.42.fr`
- **Port:** `21`
- **Username:** The value of `FTP_USER` (default: `ftpuser`)
- **Password:** The value of `FTP_PWD` from `secrets/ftp_credentials.txt` (default: `ftp123`)

## Locating and Managing Credentials

Credentials are stored in two places:

### Environment variables — `srcs/.env`

Contains non-sensitive configuration (domain name, usernames, database name). You can view it with:

```bash
cat srcs/.env
```

### Secrets — `secrets/`

Contains passwords and sensitive data. Each file holds one or more values:

| File | Contents |
|------|----------|
| `secrets/db_password.txt` | MariaDB user password |
| `secrets/db_root_password.txt` | MariaDB root password |
| `secrets/wp_credentials.txt` | WordPress DB password, admin password, and user password |
| `secrets/ftp_credentials.txt` | FTP server password |

To change a password, edit the relevant file and rebuild:

```bash
# Example: change the database password
echo "newpassword" > secrets/db_password.txt
make fclean
make
```

> **Note:** After changing database passwords, a full rebuild (`make fclean && make`) is required because the database is initialized with the original passwords.

## Checking That Services Are Running

### Quick status check

```bash
make status
```

This shows all containers with their state (running, exited, etc.) and health status.

### View logs

```bash
make logs
```

Shows combined logs from all containers. Look for error messages if something isn't working.

### Test individual services

```bash
# Check if the website responds
curl -k https://oobbad.42.fr

# Check if MariaDB is healthy
docker exec mariadb mariadb-admin ping -h localhost

# Check if Redis is caching
docker exec redis redis-cli ping
# Expected output: PONG
```
