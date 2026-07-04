FROM debian:12
RUN apt-get update &&  apt-get install -y nginx && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
	rm -rf /etc/nginx/conf.d/*.conf 
	# rm -rf /etc/nginx/sites-enabled 
COPY nginx.conf /etc/nginx/conf.d/


COPY index.html /var/www/sites/
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
# CMD ["bash"]