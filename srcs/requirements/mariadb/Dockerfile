FROM debian:12
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        mariadb-server \
        mariadb-client \
	&& apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /var/lib/mysql
RUN mkdir -p /run/mysqld /var/lib/mysql && \
    chown -R mysql:mysql /run/mysqld /var/lib/mysql
COPY tools/script.sh tools/
RUN chmod +x tools/script.sh
ENTRYPOINT [ "tools/script.sh" ]
CMD ["mariadbd", "--user=mysql", "--bind-address=0.0.0.0"]
