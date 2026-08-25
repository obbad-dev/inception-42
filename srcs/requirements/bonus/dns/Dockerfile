FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y dnsmasq && \
    rm -rf /var/lib/apt/lists/*
COPY conf/dnsmasq.conf /etc/dnsmasq.conf

CMD ["dnsmasq", "-k"]
