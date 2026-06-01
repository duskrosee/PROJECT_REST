# FUELREST SYSTEM - Management Console

System zarządzania rozproszoną siecią stacji paliw oparty o bezpieczną architekturę klient-serwer z autoryzacją JWT oraz bazą danych chronioną przez autoryzowane REST API.


## 1. Opis Architektury

Projekt został zaimplementowany w architekturze trójwarstwowej (3-Tier Architecture) opartej na wzorcu warstwowym (Layered Architecture): **DTO -> Controllers -> Services -> Repositories -> Prisma Client -> SQLite (relacyjna baza danych dev.db)**.

Gwarantuje to pełną izolację danych i uniemożliwia bezpośredni dostęp warstwy prezentacji do struktur bazodanowych.

```
+-------------------------------------------------------------+
|                  Warstwa Prezentacji (UI)                   |
|    Technologia: React 18, Vite, Tailwind CSS                |
|    - Nie posiada kluczy ani bezpośrednich sterowników       |
|    - Komunikuje się wyłącznie przez asynchroniczne HTTP     |
+------------------------------+------------------------------+
                               |
                               | Zapytania REST (Bearer JWT)
                               v
+-------------------------------------------------------------+
|             Warstwa Kontrolerów (Controllers)               |
|    Dostarcza routing i obsługuje kody statusów HTTP         |
+------------------------------+------------------------------+
                               | Walidacja DTO
                               v
+-------------------------------------------------------------+
|               Warstwa Biznesowa (Services)                  |
|    Enkapsuluje reguły RBAC, walidację i rejestr zdarzeń     |
+------------------------------+------------------------------+
                               | Logika Biznesowa
                               v
+-------------------------------------------------------------+
|                Warstwa Dostępu (Repositories)               |
|    Używa Prisma ORM do odpytywania i modyfikacji tabel      |
+------------------------------+------------------------------+
                               | Prisma Client (ORM)
                               v
+-------------------------------------------------------------+
|                    Warstwa Danych (Baza)                    |
|    Technologia: SQLite (Plik prisma/dev.db)                 |
|    - Relacyjna baza danych chroniąca integralność           |
|    - Kasowanie kaskadowe i asocjacyjne tabele (Many-to-Many)|
|    - Automatyczny SEED na starcie (domyślne stacje/konta)   |
+-------------------------------------------------------------+
```

### Spełnienie wymogu braku bezpośredniej komunikacji z bazą:
Aplikacja frontendowa (React) nie importuje żadnych bibliotek systemu plików (`fs`), ani nie posiada bezpośrednich linków do pliku bazy danych. Wszystkie odczyty i zapisy stacji, cen oraz kont użytkowników są przesyłane za pośrednictwem kwerend API na porcie `3000`. Bez poprawnego zalogowania i przedstawienia tokenu JWT z odpowiednią rolą (`admin`, `manager`, `operator`), aplikacja serwerowa odrzuca zapytania modyfikujące dane standardowym kodem błędu `401 Unauthorized` lub `403 Forbidden`.

### Interaktywna dokumentacja Swagger UI:
Dodatkowo system posiada automatycznie generowaną dokumentację zgodną ze specyfikacją OpenAPI 3.0. Dostępna pod adresem:  
**http://localhost:3000/api-docs** pozwala na podgląd, rzetelną weryfikację i bezpośrednie testowanie endpointów systemu z poziomu przeglądarki.


## 2. Diagram ERD (Encji i Relacji)

Baza danych zaimplementowana jest w SQLite i zdefiniowana w pliku `prisma/schema.prisma`. Poniżej przedstawiono graficzny model relacji:

```
  +------------------+                    +------------------+
  |       USER       |                    |       FUEL       |
  +------------------+                    +------------------+
  | id (PK) [string] |                    | id (PK) [string] |
  | username [string]|                    | name [string]    |
  | email [string]   |                    | type [enum]      |
  | fullName [string]|                    | pricePerLiter[num|
  | role [enum]      |                    | availQty [num]   |
  | createdAt [str]  |                    +--------+---------+
  | passwordHash[str]|                             |
  +------------------+                             | 1
                                                   |
                                                   | posiada przypisane
                                                   |
                                                   | 1..*
+--------------------+                    +--------v---------+
|      STATION       | 1            1..*  |   STATION_FUEL   |
|--------------------|-------------------->|------------------|
| id (PK) [string]   |                    | fuelId (FK) [str]|
| name [string]      |                    | pricePerLiter[num|
| address [string]   |                    | availQty [num]   |
| city [string]      |                    +------------------+
| workingHours [str] |
| createdAt [str]    |
+--------------------+
```

### Słownik tabel i właściwości:
* **User (Użytkownicy):** Dane kont operatorskich. `role` przyjmuje wartości: `admin` (pełny dostęp do systemu i użytkowników), `manager` (zarządzanie cenami i paliwami w katalogu), `operator` (odczyt oraz wprowadzanie dystrybucji na przypisanej stacji).
* **Fuel (Katalog Paliw):** Słownik rodzajów paliw dopuszczonych w sieci stacji. Typy: `benzyna`, `diesel`, `LPG`, `inne`.
* **Station (Stacja):** Informacje adresowe o obiekcie.
* **Station_Fuel (Paliwo Stacji):** Tabela asocjacyjna. Określa dostępność, asortyment oraz aktualne ceny paliw na konkretnej, danej stacji paliw.


## 3. Opis Endpointów REST API

Wszystkie zapytania API są obsługiwane i sprawdzane pod kątem ról użytkownika. Do autoryzacji wymagany jest nagłówek:  
`Authorization: Bearer <TOWJ_TOKEN_JWT>`

### Serwis Autoryzacji (No-Auth)
| Metoda | Endpoint | Opis | Wymagane dane wejściowe | Format odpowiedzi (200 OK) |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/auth/login` | Logowanie do systemu, generowanie tokenu JWT na 8h | `{ "username": "admin", "password": "..." }` | `{ "token": "...", "user": { "id": "...", "role": "admin" ... } }` |

### Zarządzanie Użytkownikami (Wymaga JWT)
| Metoda | Endpoint | Opis | Uprawnienia (RBAC) | Odpowiedź (Success) |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/users` | Lista wszystkich użytkowników (bez skrótów haseł) | Dowolny token | `200 OK` + tablica obiektów użytkowników |
| **POST** | `/api/users` | Rejestracja nowego operatora/managera | Bezpośrednio (No-Auth/Rejestracja) | `201 Created` + profil użytkowika |
| **PUT** | `/api/users/:id`| Modyfikacja danych użytkownika (email, hasło, uprawnienia) | `admin`, `manager` | `200 OK` + zaktualizowany obiekt |
| **DELETE**| `/api/users/:id`| Skasowanie konta z systemu | `admin` | `204 No Content` |

### Słownik i Zasoby Paliw w Katalogu
| Metoda | Endpoint | Opis | Uprawnienia (RBAC) | Odpowiedź (Success) |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/fuels` | Zwraca katalog paliw | Dowolny token / Gość | `200 OK` + lista paliw w bazie |
| **POST** | `/api/fuels` | Dodanie nowego paliwa do katalogu głównego | `admin`, `manager` | `201 Created` + obiekt nowego paliwa |
| **PUT** | `/api/fuels/:id`| Zmiana zapasu rezerwowego lub opisu paliwa | `admin`, `manager` | `200 OK` |
| **DELETE**| `/api/fuels/:id`| Usunięcie paliwa z katalogu i odpięcie go od stacji | `admin` | `204 No Content` |

### Zarządzanie Stacjami i Asortymentem
| Metoda | Endpoint | Opis | Uprawnienia (RBAC) | Odpowiedź (Success) |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/stations`| Spis stacji wraz z cenami asortymentu | Dowolny token | `200 OK` + lista stacji |
| **POST** | `/api/stations`| Założenie nowej stacji paliw | `admin`, `manager` | `201 Created` |
| **PUT** | `/api/stations/:id`| Aktualizacja cen stacji, ilości litrów lub danych adresowych | `admin`, `manager`, `operator` | `200 OK` |
| **DELETE**| `/api/stations/:id`| Likwidacja stacji z sieci | `admin` | `204 No Content` |

### System Logów Audytowych (Audit Log)
| Metoda | Endpoint | Opis | Uprawnienia (RBAC) | Odpowiedź (Success) |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/logs` | Pobiera historię operacji modyfikujących system | Dowolny token | `200 OK` + tablica 200 ostatnich logów |


## 4. Instrukcja Uruchomienia Systemu

Projekt działa jako kompletna aplikacja full-stack typu single compile (Frontend i Backend uruchamiane sunt na jednym porcie Node.js).

### Krok 1: Wymagania wstępne
* Zainstalowane środowisko **Node.js** (rekomendowana wersja v18 lub nowsza)
* System zarządzania pakietami **npm**

### Krok 2: Instalacja zależności
W folderze głównym projektu należy zainstalować pakiety poleceniem:
```bash
npm install
```

### Krok 3: Konfiguracja zmiennych środowiskowych (.env)
Aplikacja posiada plik konfiguracyjny `.env.example`. Skopiuj go i zmień nazwę na `.env`:
```bash
# Służy do podpisywania tokenów JWT zabezpieczeń
JWT_SECRET="FUEL_STATION_MGMT_SECRET_KEY_2026"
APP_URL="http://localhost:3000"
```

### Krok 4: Uruchomienie deweloperskie (Live Reload)
Uruchom serwer REST API i kompilator frontendu w trybie deweloperskim:
```bash
npm run dev
```
Aplikacja będzie dostępna pod adresem: **http://localhost:3000**

### Krok 5: Przyготовление wersji produkcyjnej (Build i Start)
Aby wygenerować skompilowaną i maksymalnie zoptymalizowaną paczkę produkcyjną, wykonaj polecenia:
```bash
npm run build
npm start
```