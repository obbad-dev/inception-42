FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y vsftpd && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY tools/ftp.sh /tools/ftp.sh
RUN chmod +x /tools/ftp.sh 

EXPOSE 21
EXPOSE 6000-6010

ENTRYPOINT ["/tools/ftp.sh"]
CMD ["vsftpd", "/etc/vsftpd.conf"]