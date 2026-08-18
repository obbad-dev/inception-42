NAME = inception

COMPOSE_FILE = srcs/docker-compose.yml

DATA_PATH = /home/oualid/data
WP_DATA   = $(DATA_PATH)/wordpress
DB_DATA   = $(DATA_PATH)/mariadb

# Color codes for ASCII Art
CYAN  = \033[1;36m
RESET = \033[0m

all: up

up:
	@echo "$(CYAN) _                      _   _                 $(RESET)"
	@echo "$(CYAN)(_)_ __   ___ ___ _ __ | |_(_) ___  _ __      $(RESET)"
	@echo "$(CYAN)| | '_ \\ / __/ _ \\ '_ \\| __| |/ _ \\| '_ \\     $(RESET)"
	@echo "$(CYAN)| | | | | (_|  __/ |_) | |_| | (_) | | | |    $(RESET)"
	@echo "$(CYAN)|_|_| |_|\\___\\___| .__/ \\__|_|\\___/|_| |_|    $(RESET)"
	@echo "$(CYAN)                 |_|                        $(RESET)"
	@echo "$(CYAN)            _     _               _       $(RESET)"
	@echo "$(CYAN)  ___  ___ | |__ | |__   __ _  __| |        $(RESET)"
	@echo "$(CYAN) / _ \\/ _ \\| '_ \\| '_ \\ / _' |/ _' |        $(RESET)"
	@echo "$(CYAN)| (_)| (_) | |_) | |_) | (_| | (_| |        $(RESET)"
	@echo "$(CYAN) \\___/\\___/|_.__/|_.__/ \\__,_|\\__,_|        $(RESET)"
	@mkdir -p $(WP_DATA)
	@mkdir -p $(DB_DATA)
	@docker compose -f $(COMPOSE_FILE) up -d --build

stop:
	@docker compose -f $(COMPOSE_FILE) stop

start:
	@docker compose -f $(COMPOSE_FILE) start

down:
	@docker compose -f $(COMPOSE_FILE) down

status:
	@docker compose -f $(COMPOSE_FILE) ps

logs:
	@docker compose -f $(COMPOSE_FILE) logs

top:
	@docker compose -f $(COMPOSE_FILE) top

clean:
	@docker compose -f $(COMPOSE_FILE) down -v --rmi all

fclean: clean
	@docker system prune -a --volumes -f
	@sudo rm -rf $(WP_DATA)
	@sudo rm -rf $(DB_DATA)

re: fclean all

.PHONY: all up stop down status logs top clean fclean re