FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY site/ /var/www/website/

EXPOSE 8000

WORKDIR /var/www/website

CMD ["python3", "-m", "http.server", "8000"]
