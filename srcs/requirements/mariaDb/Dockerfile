FROM debian:12
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        mariadb-server \
        mariadb-client \
	&& apt-get clean \
    && rm -rf /var/lib/apt/lists/*
