# Inception — Developer Documentation
*This project has been created as part of the 42 curriculum by oobbad.*
---
## 1. What is this project?
Inception is a system administration project. The goal is to set up a small web infrastructure made of **3 isolated services**, each running in its own **Docker container**, built manually from a Debian base image — no pre-built images allowed.
| Container | Role |
|---|---|
| **nginx** | HTTPS web server — the only entry point into the infrastructure |
| **wordpress** | PHP application server running WordPress + PHP-FPM |
| **mariadb** | Relational database server storing all WordPress data |
---
## 2. Directory Structure
```
inception-42/
├── Makefile                          ← builds images, runs containers, manages volumes
├── secrets/                          ← sensitive data (passwords) — gitignored
│   ├── credentials.txt               ← WordPress passwords (DB_PASSWORD, WP_ADMIN_PASSWORD, WP_USER_PASSWORD)
│   ├── db_password.txt               ← MariaDB user password (read by mariadb/script.sh)
│   └── db_root_password.txt          ← MariaDB root password (read by mariadb/script.sh)
└── srcs/
    ├── .env                          ← non-sensitive environment variables (names, URLs, emails)
    └── requirements/
        ├── nginx/
        │   ├── Dockerfile            ← builds the NGINX image
        │   └── nginx.conf            ← NGINX virtual host configuration
        ├── wordpress/
        │   ├── Dockerfile            ← builds the WordPress/PHP-FPM image
        │   └── tools/wordpress.sh    ← startup script: downloads WP, configures, starts PHP-FPM
        └── mariadb/
            ├── Dockerfile            ← builds the MariaDB image
            └── tools/script.sh       ← startup script: initializes DB, creates user, starts mariadbd
```
---
## 3. How the 3 Containers Communicate
```
Browser (host machine)
        |
        | HTTPS on port 443
        v
┌─────────────────────┐
│      NGINX          │  ← only container with a published port (-p 443:443)
│   (port 443)        │  ← serves static files (CSS, JS, images) directly
│                     │
│  If .php request → FastCGI → port 9000
└─────────┬───────────┘
          │ FastCGI protocol (TCP, port 9000)
          │ Docker DNS resolves "wordpress" to container IP
          v
┌─────────────────────┐
│    WordPress        │  ← PHP-FPM processes PHP files
│   PHP-FPM :9000     │  ← reads/writes WordPress files in shared volume
└─────────┬───────────┘
          │ MySQL protocol (TCP, port 3306)
          │ Docker DNS resolves "mariadb" to container IP
          v
┌─────────────────────┐
│     MariaDB         │  ← stores all WordPress data (posts, users, settings)
│   (port 3306)       │  ← only reachable from within the Docker network
└─────────────────────┘
All 3 containers share the Docker network named "inception"
```
---
## 4. Secrets vs Environment Variables
The subject says: *"passwords found in your Git repository will result in project failure"*
| Type of data | Where it goes | Reason |
|---|---|---|
| **Passwords** | `secrets/*.txt` (gitignored) | Never committed, never in images |
| **Names, URLs, emails** | `srcs/.env` | Not sensitive, needed at runtime |
### How secrets reach the containers
```
secrets/db_root_password.txt → mounted as → /run/secrets/db_root_password  (mariadb)
secrets/db_password.txt      → mounted as → /run/secrets/db_password        (mariadb)
secrets/credentials.txt      → mounted as → /run/secrets/credentials.txt    (wordpress)
srcs/.env                    → --env-file → environment variables            (both)
```
The scripts **read** the secret files at runtime — passwords are never baked into images.
---
## 5. How Volumes Work
```
Host machine                      Containers
/home/oobbad/data/mariadb  ←──► mariadb_data  ←──► /var/lib/mysql  (mariadb)
/home/oobbad/data/wordpress ←──► wordpress_data ←──► /var/www/html  (wordpress)
                                               ←──► /var/www/html  (nginx)
```
### Why do NGINX and WordPress share the same volume?
NGINX and WordPress both mount `wordpress_data` at `/var/www/html`.
- **NGINX** needs it to serve **static files** (CSS, JS, images) directly
- **WordPress** needs it to **execute PHP files** when NGINX forwards requests
When NGINX tells PHP-FPM `SCRIPT_FILENAME = /var/www/html/index.php`, PHP-FPM must open that path on **its own filesystem**. Because both containers mount the same volume at the same path, it works.
---
## 6. Container Startup Sequence
```
make all
 ├── create volumes + network
 ├── build 3 images
 │
 ├── docker run mariadb
 │   └── script.sh:
 │       ├── read passwords from /run/secrets/
 │       ├── validate all variables
 │       ├── fresh volume? → mariadb-install-db → CREATE DATABASE + CREATE USER
 │       └── exec mariadbd  ← MariaDB is now PID 1, ready on :3306
 │
 ├── docker run wordpress
 │   └── wordpress.sh:
 │       ├── read passwords from /run/secrets/credentials.txt
 │       ├── validate all variables
 │       ├── no index.php? → download + extract WordPress
 │       ├── wait loop (max 30×2s) until MariaDB accepts connections
 │       ├── no wp-config.php? → wp config create
 │       ├── not installed? → wp core install + wp user create
 │       ├── chown /var/www/html to www-data
 │       └── exec php-fpm8.2 -F  ← PHP-FPM is PID 1, ready on :9000
 │
 └── docker run nginx
     └── nginx -g "daemon off;"  ← NGINX is PID 1, ready on :443
```
---
## 7. Key Concepts
### PID 1 and why it matters
In a container, **PID 1 is the main process**. When PID 1 exits, the container stops. Docker sends shutdown signals (SIGTERM) **only to PID 1**.
If your server (mariadbd, php-fpm, nginx) is not PID 1, it will never receive the signal and will be force-killed without cleanup.
### What does `exec` do?
`exec "$@"` replaces the current shell process with the new process, **inheriting the same PID**. After `exec mariadbd ...`, MariaDB becomes PID 1 instead of the shell script. This is why `exec` is always the last line of our scripts.
### ENTRYPOINT vs CMD
| | ENTRYPOINT | CMD |
|---|---|---|
| **Purpose** | Always runs first | Default arguments passed to ENTRYPOINT |
| **mariadb** | `script.sh` | `mariadbd --user=mysql --bind-address=0.0.0.0` |
| **How combined** | script.sh receives CMD as `$@`, then calls `exec "$@"` |
### Idempotent scripts
Our scripts are safe to run multiple times (restart-safe):
- `script.sh` checks `if [ ! -d /var/lib/mysql/mysql ]` before initializing
- `wordpress.sh` checks `if [ ! -f index.php ]`, `if [ ! -f wp-config.php ]`, `if ! wp core is-installed`
Each step is skipped if already done — no duplicate databases, no duplicate WordPress installs.
---
## 8. Common Defense Questions
**Q: Why can't you use the `latest` tag?**
> The `latest` tag changes over time. If a new version is released your image could break. Pinning to `debian:12` ensures reproducibility.
**Q: Why must NGINX be the only entrypoint?**
> Security. Only port 443 is exposed. MariaDB (3306) and PHP-FPM (9000) are only reachable within the Docker network — no direct internet access.
**Q: Why TLS 1.2/1.3 only?**
> TLS 1.0 and 1.1 have known vulnerabilities. The subject explicitly requires 1.2 or 1.3 which are the current secure standards.
**Q: What happens if MariaDB is not ready when WordPress starts?**
> The bounded wait loop retries every 2 seconds for up to 30 attempts (60 seconds total). If MariaDB is still not ready, WordPress exits with a clear error.
**Q: Why does MariaDB have two users (root and inception_user)?**
> `root` is used only during initialization. `inception_user` is restricted to `inception_db` only. If WordPress were compromised, the attacker could not touch other databases.
**Q: Why does `chown www-data:www-data` run after install?**
> The script runs as root so all created files are owned by root. PHP-FPM workers run as `www-data`. Without chown, WordPress cannot write to `wp-content/uploads` (media) or cache directories.
**Q: Why share the volume between NGINX and WordPress at the same path?**
> NGINX sends `SCRIPT_FILENAME = /var/www/html/index.php` to PHP-FPM. PHP-FPM must open that path on its filesystem. Both containers must see the same files at the same path — achieved by mounting the same volume at `/var/www/html` in both containers.
**Q: What is FastCGI?**
> A protocol for communication between a web server and an application server. NGINX sends PHP requests to PHP-FPM over TCP using FastCGI, PHP-FPM processes them and returns HTML. NGINX itself does not execute PHP.
