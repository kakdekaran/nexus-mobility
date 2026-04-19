CITY_LOCATIONS = {
    "Delhi": [
        {"name": "Connaught Place", "base_volume": 4500},
        {"name": "India Gate", "base_volume": 3800},
        {"name": "Dwarka", "base_volume": 2500},
        {"name": "Okhla", "base_volume": 3200},
        {"name": "Lajpat Nagar", "base_volume": 4100},
        {"name": "Karol Bagh", "base_volume": 3900},
        {"name": "Rohini", "base_volume": 2800}
    ],
    "Mumbai": [
        {"name": "Andheri", "base_volume": 5200},
        {"name": "Bandra", "base_volume": 4800},
        {"name": "Borivali", "base_volume": 3500},
        {"name": "Dadar", "base_volume": 4900},
        {"name": "Colaba", "base_volume": 3100},
        {"name": "Malad", "base_volume": 3600},
        {"name": "Powai", "base_volume": 4200}
    ],
    "Bengaluru": [
        {"name": "Whitefield", "base_volume": 5500},
        {"name": "Indiranagar", "base_volume": 4200},
        {"name": "Koramangala", "base_volume": 4600},
        {"name": "Electronic City", "base_volume": 5100},
        {"name": "HSR Layout", "base_volume": 4000},
        {"name": "Bellandur", "base_volume": 5300}
    ],
    "Chennai": [
        {"name": "T. Nagar", "base_volume": 4300},
        {"name": "Adyar", "base_volume": 3400},
        {"name": "Velachery", "base_volume": 3900},
        {"name": "Anna Nagar", "base_volume": 3700},
        {"name": "OMR", "base_volume": 4800},
        {"name": "Guindy", "base_volume": 4500}
    ],
    "Hyderabad": [
        {"name": "HITEC City", "base_volume": 5000},
        {"name": "Gachibowli", "base_volume": 4700},
        {"name": "Banjara Hills", "base_volume": 3800},
        {"name": "Jubilee Hills", "base_volume": 3600},
        {"name": "Secunderabad", "base_volume": 4100},
        {"name": "Madhapur", "base_volume": 4900}
    ],
    "Pune": [
        {"name": "Kharadi", "base_volume": 4600},
        {"name": "Wagholi", "base_volume": 3800},
        {"name": "Hadapsar", "base_volume": 4700},
        {"name": "Hinjewadi", "base_volume": 5400},
        {"name": "Shivaji Nagar", "base_volume": 4200},
        {"name": "Viman Nagar", "base_volume": 4100},
        {"name": "Kalyani Nagar", "base_volume": 4400},
        {"name": "Kothrud", "base_volume": 3700},
        {"name": "Magarpatta", "base_volume": 4500},
        {"name": "Baner", "base_volume": 4300},
        {"name": "Pimpri-Chinchwad", "base_volume": 4300}
    ]
}

LOCATION_ALIASES = {
    "Pune": {
        "hadaparsar": "Hadapsar",
        "hadapar": "Hadapsar",
        "hadapsar": "Hadapsar",
        "wagholi phata": "Wagholi",
        "pcmc": "Pimpri-Chinchwad",
    }
}


def _canonical_city(city: str) -> str | None:
    city_map = {k.lower(): k for k in CITY_LOCATIONS.keys()}
    return city_map.get(str(city).strip().lower())


def canonicalize_location(city: str, location: str) -> str:
    canonical_city = _canonical_city(city)
    normalized = str(location).strip()
    if not canonical_city:
        return normalized

    for loc in CITY_LOCATIONS[canonical_city]:
        if loc["name"].lower() == normalized.lower():
            return loc["name"]

    alias = LOCATION_ALIASES.get(canonical_city, {}).get(normalized.lower())
    return alias if alias else normalized


def get_cities():
    return list(CITY_LOCATIONS.keys())

def get_locations_for_city(city: str):
    canonical = _canonical_city(city)
    if canonical:
        return [loc["name"] for loc in CITY_LOCATIONS[canonical]]
    return []

def get_location_base_volume(city: str, location: str):
    canonical_city = _canonical_city(city)
    if not canonical_city:
        return 3000

    canonical_location = canonicalize_location(canonical_city, location)
    for loc in CITY_LOCATIONS[canonical_city]:
        if loc["name"].lower() == canonical_location.lower():
            return loc["base_volume"]
    return 3000

# Mapping dictionaries for model encoding
CITY_ENCODING = {city: i for i, city in enumerate(CITY_LOCATIONS.keys())}
LOC_ENCODING = {}
_loc_id = 0
for city, locs in CITY_LOCATIONS.items():
    for loc in locs:
        LOC_ENCODING[f"{city}_{loc['name']}"] = _loc_id
        _loc_id += 1

def encode_city(city: str) -> int:
    canonical = _canonical_city(city)
    return CITY_ENCODING.get(canonical, -1)

def encode_location(city: str, location: str) -> int:
    canonical_city = _canonical_city(city)
    if not canonical_city:
        return -1

    canonical_location = canonicalize_location(canonical_city, location)

    # Try exact match first
    key = f"{canonical_city}_{canonical_location}"
    if key in LOC_ENCODING:
        return LOC_ENCODING[key]

    # Try case-insensitive
    for loc in CITY_LOCATIONS[canonical_city]:
        if loc["name"].lower() == canonical_location.lower():
            return LOC_ENCODING[f"{canonical_city}_{loc['name']}"]

    return -1
