*This project has been created as part of the 42 curriculum by oobbad.*

# Inception

A complete Docker-based infrastructure that deploys a WordPress website with MariaDB, NGINX, and several bonus services — all orchestrated with Docker Compose and managed through a Makefile.

## Description

Inception is a system administration project that builds a small but real-world infrastructure composed of multiple Docker containers, each running a single service. The entire stack runs behind an NGINX reverse proxy with TLS encryption and is accessible at `https://oobbad.42.fr`.

### Services Overview

| Service | Role | Port |
|---------|------|------|
| **NGINX** | Reverse proxy with TLS (TLSv1.2/1.3) — sole entrypoint | 443 |
| **WordPress** | PHP-FPM application server | 9000 (internal) |
| **MariaDB** | Relational database | 3306 (internal) |
| **Redis** | Object cache for WordPress | 6379 (internal) |
| **FTP** | vsftpd server pointing to WordPress volume | 21, 6000-6010 |
| **Adminer** | Web-based database management UI | 8080 (internal) |
| **DNS** | Local dnsmasq resolver for `oobbad.42.fr` | 53 |
| **Website** | Static portfolio/resume site (Python HTTP server) | 8081 (internal) |

### Architecture

```
                           ┌─────────────┐
               port 443    │             │
 User ──────────────────►  │    NGINX    │
                           │  (TLS/SSL)  │
                           └──────┬──────┘
                                  │
                ┌─────────────────┼─────────────────┐
                │                 │                  │
                ▼                 ▼                  ▼
         ┌────────────┐   ┌────────────┐     ┌────────────┐
         │ WordPress  │   │  Adminer   │     │  Website   │
         │  (PHP-FPM) │   │  /adminer/ │     │   /site/   │
         └─────┬──────┘   └────────────┘     └────────────┘
               │
          ┌────┴────┐
          │         │
          ▼         ▼
   ┌──────────┐ ┌───────┐
   │ MariaDB  │ │ Redis │
   └──────────┘ └───────┘
```

All containers communicate over an isolated Docker bridge network (`inception-net`). Only NGINX exposes a port to the host.

### Project Design Choices

**Docker is used instead of Virtual Machines** because each service runs in its own lightweight, isolated container. Containers share the host kernel, start in seconds, and use a fraction of the resources a full VM would require. This makes the infrastructure portable and reproducible — anyone can `make` and get the same stack regardless of their host OS.

**Docker secrets are used for sensitive data** (database passwords, WordPress credentials, FTP password) instead of passing them as environment variables. While `.env` variables are convenient for non-sensitive configuration (domain name, usernames, database name), they can appear in container inspect output and process listings. Docker secrets are mounted as files in `/run/secrets/` inside the container and are only accessible to the services that declare them, providing a stronger security boundary.

**A Docker bridge network (`inception-net`)** is used instead of the host network. The bridge network isolates containers from the host and from each other — services can only communicate if they are on the same named network. With host networking, every container would share the host's network stack, creating port conflicts and removing isolation.

**Docker volumes with bind mounts** are used for MariaDB and WordPress data. Bind mounts map a specific host directory (`/home/<login>/data/`) to the container, making the data visible and manageable from the host filesystem. This is preferred over anonymous Docker volumes for this project because the data needs to persist across `docker compose down` and be easily locatable for backup or inspection. The trade-off is that bind mounts are tied to a specific host path, while named Docker volumes are managed entirely by Docker and are more portable.

## Instructions

### Prerequisites

- Docker Engine and Docker Compose (v2)
- `make`
- `sudo` privileges (for DNS configuration)

### Quick Start

```bash
git clone <repository-url>
cd inception-42
make
```

On first run, the setup script detects missing configuration files and asks you to either use default test values or enter them manually. After that, `make` builds and starts all containers.

### Makefile Commands

| Command | Description |
|---------|-------------|
| `make` | Build and start the entire stack |
| `make stop` | Stop all containers (preserves state) |
| `make start` | Restart stopped containers |
| `make down` | Stop and remove containers, restore DNS |
| `make status` | Show container status |
| `make logs` | View container logs |
| `make clean` | Remove containers, volumes, and images |
| `make fclean` | Full clean — prune system and delete data directories |
| `make re` | Full clean + rebuild from scratch |

### Accessing the Services

| Service | URL |
|---------|-----|
| WordPress site | `https://oobbad.42.fr` |
| WordPress admin | `https://oobbad.42.fr/wp-admin` |
| Adminer (DB UI) | `https://oobbad.42.fr/adminer/` |
| Static website | `https://oobbad.42.fr/website/` |
| FTP | `ftp://oobbad.42.fr` (port 21) |

> **Note:** The DNS container resolves `oobbad.42.fr` to `127.0.0.1`. The Makefile locks `/etc/resolv.conf` to use the local DNS during operation and restores it on `make down`.

## Resources

### Documentation & References

- [Docker Documentation](https://docs.docker.com/) — Official Docker reference
- [Docker Compose Specification](https://docs.docker.com/compose/compose-file/) — Compose file format
- [Docker Secrets](https://docs.docker.com/engine/swarm/secrets/) — Managing sensitive data
- [NGINX SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html) — HTTPS setup guide
- [WordPress CLI (wp-cli)](https://wp-cli.org/) — Command-line interface for WordPress
- [MariaDB Knowledge Base](https://mariadb.com/kb/en/) — MariaDB documentation
- [Redis Documentation](https://redis.io/docs/) — Redis caching reference
- [vsftpd Manual](https://security.appspot.com/vsftpd.html) — FTP server configuration
- [dnsmasq Documentation](https://thekelleys.org.uk/dnsmasq/doc.html) — Lightweight DNS/DHCP server

### AI Usage

AI tools were used during this project for:
- Generating boilerplate configuration files and reviewing Dockerfile best practices.
- Debugging container networking issues and Docker Compose dependency chains.
- Writing documentation (this README, USER_DOC.md, DEV_DOC.md).
- Creating the `setup.sh` script for automated project configuration.

All AI-generated content was reviewed, tested, and adapted to fit the project requirements.
