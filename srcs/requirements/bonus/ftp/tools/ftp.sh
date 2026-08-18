#!/bin/bash

if [ ! -f /run/secrets/ftp_credentials ]; then
    echo "[ERROR] ftp_credentials is missing!" >&2
    exit 1
fi

source /run/secrets/ftp_credentials

if [ -z "$FTP_USER" ] || [ -z "$FTP_PWD" ]; then
    echo "[ERROR] One or more required variables are missing!" >&2
    exit 1
fi

if ! id "$FTP_USER" &>/dev/null; then
    adduser "$FTP_USER" --disabled-password --gecos ""
    echo "$FTP_USER:$FTP_PWD" | chpasswd
    usermod -aG 33 "$FTP_USER"
fi

until [ -f /var/www/html/wp-config.php ]; do
    sleep 2
done

chown -R 33:33 /var/www/html
chmod -R g+w /var/www/html

if ! grep -q "#isconfigured" /etc/vsftpd.conf; then
    sed -i -r "s/#write_enable=YES/write_enable=YES/1" /etc/vsftpd.conf
    sed -i -r "s/#chroot_local_user=YES/chroot_local_user=YES/1" /etc/vsftpd.conf
    echo "
local_enable=YES
allow_writeable_chroot=YES
pasv_enable=YES
seccomp_sandbox=NO
local_root=/var/www/html
pasv_min_port=6000
pasv_max_port=6010
local_umask=0002
#isconfigured" >> /etc/vsftpd.conf
fi
mkdir -p /var/run/vsftpd/empty
exec "$@"