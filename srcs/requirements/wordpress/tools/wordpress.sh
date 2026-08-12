#!/bin/bash

set -e

WP_DIR="/var/www/html"

if [ ! -f /run/secrets/credentials.txt ]; then
    echo "[ERROR] credentials.txt is missing!" >&2
    exit 1
fi
if [ ! -f /run/secrets/db_password ]; then
    echo "[ERROR] db_password secret is missing!" >&2
    exit 1
fi
if [ ! -f /run/secrets/wp_admin_password ]; then
    echo "[ERROR] wp_admin_password secret is missing!" >&2
    exit 1
fi
if [ ! -f /run/secrets/wp_user_password ]; then
    echo "[ERROR] wp_user_password secret is missing!" >&2
    exit 1
fi

source /run/secrets/credentials.txt
DB_PASSWORD=$(cat /run/secrets/db_password)
WP_ADMIN_PASSWORD=$(cat /run/secrets/wp_admin_password)
WP_USER_PASSWORD=$(cat /run/secrets/wp_user_password)

if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$WP_URL" ]; then
    echo "[ERROR] One or more required variables are missing in credentials.txt!" >&2
    exit 1
fi

if [ ! -f "$WP_DIR/index.php" ]; then
    echo "WordPress not found, downloading..."
    rm -f "$WP_DIR/index.html"
    curl -fsSL https://wordpress.org/latest.tar.gz -o /tmp/wordpress.tar.gz
    tar -xzf /tmp/wordpress.tar.gz -C /tmp
    cp -a /tmp/wordpress/. "$WP_DIR/"
    rm -rf /tmp/wordpress /tmp/wordpress.tar.gz
fi

echo "Waiting for MariaDB..."
max_attempts=30
counter=0
until mariadb -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" >/dev/null 2>&1; do
    counter=$((counter + 1))
    if [ "$counter" -ge "$max_attempts" ]; then
        echo "[ERROR] MariaDB failed to start or connection refused within $max_attempts seconds" >&2
        exit 1
    fi
    sleep 2
done
echo "MariaDB is ready."

if [ ! -f "$WP_DIR/wp-config.php" ]; then
    echo "Creating wp-config.php..."
    wp config create \
        --path="$WP_DIR" \
        --dbname="$DB_NAME" \
        --dbuser="$DB_USER" \
        --dbpass="$DB_PASSWORD" \
        --dbhost="$DB_HOST" \
        --allow-root
fi

if ! wp core is-installed --path="$WP_DIR" --allow-root; then
    echo "Installing WordPress..."
    wp core install \
        --path="$WP_DIR" \
        --url="$WP_URL" \
        --title="$WP_TITLE" \
        --admin_user="$WP_ADMIN_USER" \
        --admin_password="$WP_ADMIN_PASSWORD" \
        --admin_email="$WP_ADMIN_EMAIL" \
        --allow-root

    wp user create "$WP_USER" "$WP_USER_EMAIL" \
        --user_pass="$WP_USER_PASSWORD" \
        --role=author \
        --path="$WP_DIR" \
        --allow-root
fi

echo "WordPress is ready."
chown -R www-data:www-data /var/www/html
exec php-fpm8.2 -F