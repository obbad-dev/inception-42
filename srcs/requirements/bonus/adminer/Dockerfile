FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    php-fpm \
    php-mysql \
    php-mbstring \
    wget \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN sed -i 's|^listen = .*|listen = 0.0.0.0:8080|' /etc/php/8.2/fpm/pool.d/www.conf &&\
    mkdir -p /var/www/html/adminer /run/php

WORKDIR /var/www/html/adminer
RUN wget --no-check-certificate https://github.com/vrana/adminer/releases/download/v4.8.1/adminer-4.8.1.php -O adminer.php


CMD ["php-fpm8.2", "-F"]
