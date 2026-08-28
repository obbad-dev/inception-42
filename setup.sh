#!/bin/bash
# ============================================================================
# setup.sh - Inception project setup script
# ============================================================================
# This script ensures the .env and secrets files exist before building.
# If any are missing, it offers two options:
#   1) Create them with default test values (quick start)
#   2) Ask for every value interactively (custom setup)
#
# Safe to run multiple times: it never overwrites existing files.
# ============================================================================

# --- Colors ---------------------------------------------------------------
CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
RESET='\033[0m'

# --- Paths ----------------------------------------------------------------
ENV_FILE="srcs/.env"
SECRETS_DIR="secrets"
DB_PASS_FILE="$SECRETS_DIR/db_password.txt"
DB_ROOT_PASS_FILE="$SECRETS_DIR/db_root_password.txt"
WP_CREDS_FILE="$SECRETS_DIR/wp_credentials.txt"
FTP_CREDS_FILE="$SECRETS_DIR/ftp_credentials.txt"

# --- Check what is missing ------------------------------------------------
# We track which groups are missing so we only create what's needed.

env_missing=false
secrets_missing=false

if [ ! -f "$ENV_FILE" ]; then
    env_missing=true
fi

# All four secret files must exist for the secrets to be considered complete.
if [ ! -f "$DB_PASS_FILE" ] || [ ! -f "$DB_ROOT_PASS_FILE" ] \
   || [ ! -f "$WP_CREDS_FILE" ] || [ ! -f "$FTP_CREDS_FILE" ]; then
    secrets_missing=true
fi

# --- If everything exists, exit silently ----------------------------------
if [ "$env_missing" = false ] && [ "$secrets_missing" = false ]; then
    exit 0
fi

# --- Show what is missing -------------------------------------------------
echo ""
echo -e "${YELLOW}⚠  Some configuration files are missing:${RESET}"
if [ "$env_missing" = true ]; then
    echo -e "   ${RED}✗${RESET} $ENV_FILE"
fi
if [ "$secrets_missing" = true ]; then
    [ ! -f "$DB_PASS_FILE" ]      && echo -e "   ${RED}✗${RESET} $DB_PASS_FILE"
    [ ! -f "$DB_ROOT_PASS_FILE" ] && echo -e "   ${RED}✗${RESET} $DB_ROOT_PASS_FILE"
    [ ! -f "$WP_CREDS_FILE" ]     && echo -e "   ${RED}✗${RESET} $WP_CREDS_FILE"
    [ ! -f "$FTP_CREDS_FILE" ]    && echo -e "   ${RED}✗${RESET} $FTP_CREDS_FILE"
fi
echo ""

# --- Ask the user how to proceed -----------------------------------------
echo -e "${CYAN}How do you want to configure the project?${RESET}"
echo "  1) Use default test values  (quick start)"
echo "  2) Enter values manually    (custom setup)"
echo ""
read -rp "Your choice [1/2]: " choice

# ========================================================================
# Helper: create_env_file
# ========================================================================
# Generates srcs/.env with the given variable values.
# Arguments are passed as positional parameters (see calls below).
# ========================================================================
create_env_file() {
    cat > "$ENV_FILE" <<EOF
LOGIN=$1
DOMAIN_NAME=$2
MYSQL_DATABASE=$3
MYSQL_USER=$4
DB_HOST=$5
WP_URL=https://\${DOMAIN_NAME}
WP_TITLE="$6"
WP_ADMIN_USER=$7
WP_ADMIN_EMAIL=$8
WP_USER=$9
WP_USER_EMAIL=${10}
REDIS_HS=${11}
FTP_USER=${12}
EOF
    echo -e "   ${GREEN}✓${RESET} Created $ENV_FILE"
}

# ========================================================================
# Helper: create_secrets_files
# ========================================================================
# Generates the four secret files.
# Arguments: db_password  db_root_password  wp_admin_pw  wp_user_pw  ftp_pw
# ========================================================================
create_secrets_files() {
    local db_pw="$1"
    local db_root_pw="$2"
    local wp_admin_pw="$3"
    local wp_user_pw="$4"
    local ftp_pw="$5"

    mkdir -p "$SECRETS_DIR"

    if [ ! -f "$DB_PASS_FILE" ]; then
        printf '%s' "$db_pw" > "$DB_PASS_FILE"
        echo -e "   ${GREEN}✓${RESET} Created $DB_PASS_FILE"
    fi

    if [ ! -f "$DB_ROOT_PASS_FILE" ]; then
        printf '%s' "$db_root_pw" > "$DB_ROOT_PASS_FILE"
        echo -e "   ${GREEN}✓${RESET} Created $DB_ROOT_PASS_FILE"
    fi

    if [ ! -f "$WP_CREDS_FILE" ]; then
        cat > "$WP_CREDS_FILE" <<EOF
DB_PASSWORD=$db_pw
WP_ADMIN_PASSWORD=$wp_admin_pw
WP_USER_PASSWORD=$wp_user_pw
EOF
        echo -e "   ${GREEN}✓${RESET} Created $WP_CREDS_FILE"
    fi

    if [ ! -f "$FTP_CREDS_FILE" ]; then
        printf 'FTP_PWD=%s' "$ftp_pw" > "$FTP_CREDS_FILE"
        echo -e "   ${GREEN}✓${RESET} Created $FTP_CREDS_FILE"
    fi
}

# ========================================================================
# Option 1 – Default test values
# ========================================================================
apply_defaults() {
    echo ""
    echo -e "${CYAN}Creating missing files with default test values...${RESET}"

    # --- .env defaults (same values you already use for testing) ----------
    if [ "$env_missing" = true ]; then
        create_env_file \
        	"${USER}" \
            "oobbad.42.fr" \
            "inception_db" \
            "inception_user" \
            "mariadb" \
            "My Inception Website" \
            "oobbad" \
            "oobbad@student.1337.ma" \
            "second_user" \
            "second@student.1337.ma" \
            "redis" \
            "ftpuser"
    fi

    # --- Secrets defaults -------------------------------------------------
    if [ "$secrets_missing" = true ]; then
        create_secrets_files "data123" "1233" "1233" "hello22" "ftp123"
    fi
}

# ========================================================================
# Option 2 – Manual / interactive configuration
# ========================================================================
ask_manually() {
    echo ""
    echo -e "${CYAN}Enter your values below (press Enter to accept the default shown in brackets):${RESET}"
    echo ""

    # --- .env variables ---------------------------------------------------
    if [ "$env_missing" = true ]; then
        echo -e "${YELLOW}── .env variables ──${RESET}"
        v_login=${USER}
        read -rp "DOMAIN_NAME [oobbad.42.fr]: "      v_domain;         v_domain=${v_domain:-oobbad.42.fr}
        read -rp "MYSQL_DATABASE [inception_db]: "    v_mysql_db;       v_mysql_db=${v_mysql_db:-inception_db}
        read -rp "MYSQL_USER [inception_user]: "      v_mysql_user;     v_mysql_user=${v_mysql_user:-inception_user}
        read -rp "DB_HOST [mariadb]: "                v_db_host;        v_db_host=${v_db_host:-mariadb}
        read -rp "WP_TITLE [My Inception Website]: "  v_wp_title;      v_wp_title=${v_wp_title:-My Inception Website}
        read -rp "WP_ADMIN_USER [oobbad]: "           v_wp_admin;       v_wp_admin=${v_wp_admin:-oobbad}
        read -rp "WP_ADMIN_EMAIL [oobbad@student.1337.ma]: " v_wp_admin_email; v_wp_admin_email=${v_wp_admin_email:-oobbad@student.1337.ma}
        read -rp "WP_USER [second_user]: "            v_wp_user;        v_wp_user=${v_wp_user:-second_user}
        read -rp "WP_USER_EMAIL [second@student.1337.ma]: "  v_wp_user_email; v_wp_user_email=${v_wp_user_email:-second@student.1337.ma}
        read -rp "REDIS_HS [redis]: "                 v_redis;          v_redis=${v_redis:-redis}
        read -rp "FTP_USER [ftpuser]: "               v_ftp_user;       v_ftp_user=${v_ftp_user:-ftpuser}

        echo ""
        create_env_file \
            "$v_login" "$v_domain" "$v_mysql_db" "$v_mysql_user" \
            "$v_db_host" "$v_wp_title" "$v_wp_admin" \
            "$v_wp_admin_email" "$v_wp_user" "$v_wp_user_email" \
            "$v_redis" "$v_ftp_user"
    fi

    # --- Secrets ----------------------------------------------------------
    if [ "$secrets_missing" = true ]; then
        echo ""
        echo -e "${YELLOW}── Secrets ──${RESET}"

        read -rp "DB_PASSWORD [data123]: "            v_db_pw;          v_db_pw=${v_db_pw:-data123}
        read -rp "DB_ROOT_PASSWORD [1233]: "          v_db_root_pw;     v_db_root_pw=${v_db_root_pw:-1233}
        read -rp "WP_ADMIN_PASSWORD [1233]: "         v_wp_admin_pw;    v_wp_admin_pw=${v_wp_admin_pw:-1233}
        read -rp "WP_USER_PASSWORD [hello22]: "       v_wp_user_pw;     v_wp_user_pw=${v_wp_user_pw:-hello22}
        read -rp "FTP_PWD [ftp123]: "                 v_ftp_pw;         v_ftp_pw=${v_ftp_pw:-ftp123}

        echo ""
        create_secrets_files "$v_db_pw" "$v_db_root_pw" "$v_wp_admin_pw" "$v_wp_user_pw" "$v_ftp_pw"
    fi
}

# --- Dispatch based on user choice ---------------------------------------
case "$choice" in
    1) apply_defaults ;;
    2) ask_manually   ;;
    *)
        echo -e "${RED}Invalid choice. Aborting.${RESET}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✓ Setup complete! Continuing with the build...${RESET}"
echo ""
