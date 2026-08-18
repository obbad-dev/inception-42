FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y nginx openssl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
	rm -rf /etc/nginx/sites-enabled/*

RUN mkdir -p /etc/nginx/certs && \
	openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
		-keyout /etc/nginx/certs/server.key \
		-out /etc/nginx/certs/server.crt \
		-subj "/C=MA/ST=Rabat-sale/L=Rabat/O=UM6P-1337/OU=1337-cluster-1/CN=oobbad.42.fr"

COPY config/nginx.conf /etc/nginx/sites-enabled/

EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]