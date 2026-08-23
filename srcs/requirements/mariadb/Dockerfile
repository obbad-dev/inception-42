FROM debian:bookworm-slim
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        mariadb-server \
        mariadb-client \
	&& apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /var/lib/mysql
RUN mkdir -p /run/mysqld /var/lib/mysql && \
    chown -R mysql:mysql /run/mysqld /var/lib/mysql
COPY tools/mariadb.sh tools/
RUN chmod +x tools/mariadb.sh
ENTRYPOINT [ "tools/mariadb.sh" ]
CMD ["mariadbd", "--user=mysql", "--bind-address=0.0.0.0"]
