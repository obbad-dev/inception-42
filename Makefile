NAME = inception
COMPOSE_FILE = srcs/docker-compose.yml

DATA_PATH = /home/$(USER)/data
WP_DATA   = $(DATA_PATH)/wordpress
DB_DATA   = $(DATA_PATH)/mariadb

CYAN   = \033[1;36m
GREEN  = \033[1;32m
YELLOW = \033[1;33m
RED    = \033[1;31m
RESET  = \033[0m

all: up

build:
	@echo "$(CYAN)Building containers...$(RESET)"
	@docker compose -f $(COMPOSE_FILE) build > /dev/null &\
	PID=$$!; \
	frames="[🐳...........] [.🐳..........] [..🐳.........] [...🐳........] [....🐳.......] [.....🐳......] [......🐳.....] [.......🐳....] [........🐳...] [.........🐳..] [..........🐳.] [...........🐳] [🚀...........] [.🚀..........] [..🚀.........] [...🚀........] [....🚀.......] [.....🚀......] [......🚀.....] [.......🚀....] [........🚀...] [.........🚀..] [..........🚀.] [...........🚀]"; \
	while kill -0 $$PID 2>/dev/null; do \
		for f in $$frames; do \
			if ! kill -0 $$PID 2>/dev/null; then break; fi; \
			printf "\r$(YELLOW)%s $(RESET) " "$$f"; \
			sleep 0.12; \
		done; \
	done;

up: build
	@echo "$(CYAN)Creating data directories...$(RESET)"
	@mkdir -p $(WP_DATA)
	@mkdir -p $(DB_DATA)
	@echo "$(CYAN)Building and starting containers...$(RESET)"
	@docker compose -f $(COMPOSE_FILE) up -d
	@echo "$(YELLOW)Locking DNS to local dnsmasq container...$(RESET)"
	@sudo chattr -i /etc/resolv.conf 2>/dev/null || true
	@sudo rm -f /etc/resolv.conf
	@echo "nameserver 10.152.16.116" | sudo tee /etc/resolv.conf > /dev/null
	@sudo chattr +i /etc/resolv.conf
	@echo ""
	@echo "$(GREEN) _                    _   _                 $(RESET)"
	@echo "$(GREEN)(_)_ __   ___ ___ _ __ | |_(_) ___  _ __      $(RESET)"
	@echo "$(GREEN)| | '_ \\ / __/ _ \\ '_ \\| __| |/ _ \\| '_ \\     $(RESET)"
	@echo "$(GREEN)| | | | | (_|  __/ |_) | |_| | (_) | | | |    $(RESET)"
	@echo "$(GREEN)|_|_| |_|\\___\\___| .__/ \\__|_|\\___/|_| |_|    $(RESET)"
	@echo "$(GREEN)                 |_|                        $(RESET)"
	@echo "$(GREEN)            _     _               _         $(RESET)"
	@echo "$(GREEN) ___  ___ | |__ | |__   __ _  __| |         $(RESET)"
	@echo "$(GREEN)/ _ \\/ _ \\| '_ \\| '_ \\ / _' |/ _' |         $(RESET)"
	@echo "$(GREEN)| (_)| (_) | |_) | |_) | (_| | (_| |         $(RESET)"
	@echo "$(GREEN)\\___/\\___/|_.__/|_.__/ \\__,_|\\__,_|         $(RESET)"
	@echo ""
	@echo "$(GREEN)==============================================$(RESET)"
	@echo "$(GREEN)       ✓ INCEPTION STARTED SUCCESSFULLY!      $(RESET)"
	@echo "$(GREEN)==============================================$(RESET)"

stop:
	@docker compose -f $(COMPOSE_FILE) stop

start:
	@docker compose -f $(COMPOSE_FILE) start

down: restartResv
	@docker compose -f $(COMPOSE_FILE) down

status:
	@docker compose -f $(COMPOSE_FILE) ps

logs:
	@docker compose -f $(COMPOSE_FILE) logs

top:
	@docker compose -f $(COMPOSE_FILE) top

clean: restartResv
	@echo "$(RED)Stopping containers and removing volumes...$(RESET)"
	@docker compose -f $(COMPOSE_FILE) down -v --rmi all

fclean: clean
	@echo "$(RED)Performing deep clean (System Prune & Data Removal)...$(RESET)"
	@docker system prune -a --volumes -f
	@sudo rm -rf $(WP_DATA)
	@sudo rm -rf $(DB_DATA)

re: fclean all

restartResv:
	@echo "$(YELLOW)Restoring default OS DNS...$(RESET)"
	@sudo chattr -i /etc/resolv.conf 2>/dev/null || true
	@sudo rm -f /etc/resolv.conf
	@sudo ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf
	@sudo systemctl restart systemd-resolved
	@echo "$(GREEN)Internet restored to normal.$(RESET)"
.PHONY: all up stop start down status logs top clean fclean re restartResv
