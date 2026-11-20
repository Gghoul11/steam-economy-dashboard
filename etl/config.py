"""Rutas, esquema de entrada y reglas de negocio del pipeline (Fase 1 §3.3 y Fase 2 §0.1)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_CSV = ROOT / "data" / "raw" / "games.csv"
INTERIM_DIR = ROOT / "data" / "interim"
PROCESSED_DIR = ROOT / "data" / "processed"
WEB_DATA_DIR = ROOT / "web" / "public" / "data"

RAW_PARQUET = INTERIM_DIR / "games_raw.parquet"
CLEAN_PARQUET = PROCESSED_DIR / "games_clean.parquet"
QUALITY_REPORT = PROCESSED_DIR / "quality_report.md"

# La cabecera original fusiona "Discount" y "DLC count" en "DiscountDLC count"
# (39 nombres para 40 valores). Se reemplaza por esta lista explícita.
RAW_COLUMNS = [
    "app_id", "name", "release_date_raw", "estimated_owners", "peak_ccu", "required_age",
    "price", "discount", "dlc_count", "about_the_game", "supported_languages",
    "full_audio_languages", "reviews", "header_image", "website", "support_url",
    "support_email", "windows", "mac", "linux", "metacritic_score", "metacritic_url",
    "user_score", "positive", "negative", "score_rank", "achievements", "recommendations",
    "notes", "average_playtime_forever", "average_playtime_two_weeks",
    "median_playtime_forever", "median_playtime_two_weeks", "developers", "publishers",
    "categories", "genres", "tags", "screenshots", "movies",
]
EXPECTED_HEADER_FIELDS = 39

# Columnas que no se conservan (texto largo, URLs o >96 % vacías; ver Fase 1 §1.4)
DROP_COLUMNS = [
    "about_the_game", "full_audio_languages", "reviews", "website", "support_url",
    "support_email", "metacritic_url", "user_score", "score_rank", "notes",
    "screenshots", "movies", "average_playtime_two_weeks", "median_playtime_two_weeks",
]

# Géneros que identifican un videojuego; un título sin ninguno se considera software.
GAME_GENRES = {
    "Action", "Adventure", "Casual", "Indie", "RPG", "Simulation", "Strategy", "Sports",
    "Racing", "Massively Multiplayer", "Free to Play", "Early Access",
}
# Géneros que describen modelo/estado y no temática (no sirven como "género principal").
NON_THEMATIC_GENRES = {"Indie", "Early Access", "Free to Play"}

NOISE_PATTERN = r"(?i)\b(playtest|demo|soundtrack)\b"
F2P_LABEL = "Free to Play"

MIN_REVIEWS_UNIVERSE = 10
PRICE_OUTLIER_USD = 80.0              # Fase 2 §0.1: banda superior "$40–79.99"
PLAYTIME_MAX_PLAUSIBLE_H = 5_000      # ≈ 13,7 h diarias durante un año
MIN_TITLES_PER_TAG = 30
STEAM_LAUNCH_YEAR = 2003
MATURITY_DAYS = 365                   # cohortes con ≥ 12 meses para tendencias

# (límite inferior inclusivo, límite superior exclusivo, etiqueta)
PRICE_BANDS = [
    (0.01, 5.0, "<$5"),
    (5.0, 10.0, "$5–9.99"),
    (10.0, 20.0, "$10–19.99"),
    (20.0, 40.0, "$20–39.99"),
    (40.0, PRICE_OUTLIER_USD, "$40–79.99"),
]

# Sinónimos detectados en géneros/tags (clave en minúsculas → forma canónica)
LABEL_SYNONYMS = {
    "free to play": "Free to Play",
    "rogue-like": "Roguelike",
    "rogue-lite": "Roguelite",
    "rpg": "RPG",
    "jrpg": "JRPG",
    "mmorpg": "MMORPG",
}
