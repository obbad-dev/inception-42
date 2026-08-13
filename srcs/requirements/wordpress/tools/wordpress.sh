#!/bin/bash

set -e

WP_DIR="/var/www/html"

if [ ! -f /run/secrets/wp_credentials ]; then
    echo "[ERROR] credentials.txt is missing!" >&2
    exit 1
fi

source /run/secrets/wp_credentials

if [ -z "$DB_HOST" ]           || \
   [ -z "$MYSQL_DATABASE" ]    || \
   [ -z "$MYSQL_USER" ]        || \
   [ -z "$DB_PASSWORD" ]       || \
   [ -z "$WP_URL" ]            || \
   [ -z "$WP_TITLE" ]          || \
   [ -z "$WP_ADMIN_USER" ]     || \
   [ -z "$WP_ADMIN_PASSWORD" ] || \
   [ -z "$WP_ADMIN_EMAIL" ]    || \
   [ -z "$WP_USER" ]           || \
   [ -z "$WP_USER_PASSWORD" ]  || \
   [ -z "$WP_USER_EMAIL" ]; then
    echo "[ERROR] One or more required variables are missing!" >&2
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
until mariadb -h"$DB_HOST" -u"$MYSQL_USER" -p"$DB_PASSWORD" -e "SELECT 1;" >/dev/null 2>&1; do
    counter=$((counter + 1))
    if [ "$counter" -ge "$max_attempts" ]; then
        echo "[ERROR] MariaDB failed to start or connection refused within $max_attempts seconds" >&2
        exit 1
    fi
    sleep 2
done

if [ ! -f "$WP_DIR/wp-config.php" ]; then
    wp config create \
        --path="$WP_DIR" \
        --dbname="$MYSQL_DATABASE" \
        --dbuser="$MYSQL_USER" \
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

chown -R www-data:www-data /var/www/html
exec php-fpm8.2 -F