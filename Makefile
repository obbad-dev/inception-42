all:
	sudo mkdir -p /home/oobbad/data/mariadb
	sudo mkdir -p /home/oobbad/data/wordpress
	sudo chown -R oualid:oualid /home/oobbad/data

	docker volume create --driver local --opt type=none --opt device=/home/oobbad/data/mariadb --opt o=bind mariadb_data
	docker volume create --driver local --opt type=none --opt device=/home/oobbad/data/wordpress --opt o=bind wordpress_data

	docker network create inception || true
	docker build -t mariadb:image ./srcs/requirements/mariadb
	docker build -t wordpress:image ./srcs/requirements/wordpress
	docker build -t nginx:image ./srcs/requirements/nginx

	docker run -d --name mariadb --network inception \
		--env-file ./srcs/.env \
		-v $$(pwd)/secrets/db_root_password.txt:/run/secrets/db_root_password:ro \
		-v $$(pwd)/secrets/db_password.txt:/run/secrets/db_password:ro \
		--volume mariadb_data:/var/lib/mysql \
		mariadb:image

	docker run -d --name wordpress --network inception \
		-v $$(pwd)/secrets/credentials.txt:/run/secrets/credentials.txt:ro \
		-v $$(pwd)/secrets/db_password.txt:/run/secrets/db_password:ro \
		-v $$(pwd)/secrets/wp_admin_password.txt:/run/secrets/wp_admin_password:ro \
		-v $$(pwd)/secrets/wp_user_password.txt:/run/secrets/wp_user_password:ro \
		--volume wordpress_data:/var/www/html \
		wordpress:image

	docker run -d --name nginx --network inception \
		-p 443:443 \
		--volume wordpress_data:/var/www/html \
		nginx:image

clean:
	docker stop nginx wordpress mariadb
	docker rm nginx wordpress mariadb
	docker volume rm wordpress_data mariadb_data
	docker network rm inception
	docker rmi wordpress:image
	docker rmi nginx:image
	docker rmi mariadb:image
	sudo rm -rf /home/oobbad/data/*
	