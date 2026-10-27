# EAC OSBP Digital Field Guide & Training Platform

Unified full-stack application digitizing the East African Community (EAC) One-Stop Border Post (OSBP) Procedures and Migration Module.

## Architecture

- **Frontend:** Angular 19 (Standalone Components, Signals, Hash Router, Tailwind-styled responsive UI)
- **Backend:** Spring Boot 3 (Java 21, Spring Security with stateless JWT, Spring Data JPA, Apache PDFBox, Swagger/OpenAPI)
- **Database:** PostgreSQL (supports local dev or cloud providers like Supabase / Neon / Heroku with `sslmode=require`)
- **Deployment:** Unified multi-stage Docker container serving both Angular SPA static assets and Spring Boot REST APIs from a single port.

---

## Project Structure

```
├── backend/                   # Spring Boot 3 Java backend
│   ├── src/main/java/         # Controllers, Security, Services, Repositories, Models
│   ├── src/main/resources/    # application.properties, static resources
│   ├── pom.xml                # Maven configuration
│   └── .env.example           # Example local environment variables
├── frontend/                  # Angular 19 frontend
│   ├── src/app/               # Standalone components, services, guards
│   ├── package.json           # Frontend dependencies
│   └── angular.json           # Angular build configuration
├── Dockerfile                 # Unified multi-stage production Docker build
├── .dockerignore
├── .gitignore
└── OSBP MIGRATION MODULE-v 5.4. en.pdf  # Manual used for automated database seeding
```

---

## Automatic Database Seeding & Default Accounts

On initial launch, the Spring Boot `DataSeeder` automatically parses `OSBP MIGRATION MODULE-v 5.4. en.pdf` into structured sections and seeds default credentials:

| Role | Email | Default Password |
| :--- | :--- | :--- |
| **Admin** | `admin@osbp.com` | `Admin@1234` |
| **Admin** | `admin@eac.int` | `Admin@1234` |
| **Officer / User** | `officer@osbp.com` | `Officer@1234` |
| **Officer / User** | `officer.namanga@eac.int` | `Officer@1234` |

---

## Local Development

### Prerequisites
- **Java JDK 21+**
- **Node.js 20+** & **npm**
- **Maven 3.8+** (or use included `mvnw`)
- **PostgreSQL 14+** (Local service or cloud PostgreSQL instance)

### 1. Database Setup
Create a PostgreSQL database named `osbp_db`:
```sql
CREATE DATABASE osbp_db;
```
Verify or configure credentials in `backend/src/main/resources/application.properties` (or set environment variables: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`).

### 2. Run the Backend
```bash
cd backend
./mvnw spring-boot:run
```
*(On Windows: `mvn spring-boot:run` or `.\mvnw.cmd spring-boot:run`)*

- Backend API: `http://localhost:8080`
- Swagger UI / OpenAPI: `http://localhost:8080/swagger-ui/index.html`

### 3. Run the Frontend
```bash
cd frontend
npm install
npm start
```
- Angular dev server: `http://localhost:4200` (automatically proxies API requests to `http://localhost:8080`).

---

## Running with Docker (Zero Dependencies)

If you have Docker Desktop installed, you can launch the complete full-stack environment (PostgreSQL database + Spring Boot backend + Angular frontend) with a single command without installing Java, Node.js, or PostgreSQL locally:

```bash
docker compose up --build
```

- **PostgreSQL Database:** Automatically initialized and linked on port `5432`.
- **Application (Frontend + Backend):** Accessible at `http://localhost:8080`.
- **Database Seeding:** Automatically runs on the first launch to ingest the PDF manual and set up default accounts.
- To stop the services:
  ```bash
  docker compose down
  ```

---

## Contributing Workflow

1. Pull latest changes: `git checkout main && git pull origin main`
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make changes and verify:
   - Frontend build: `cd frontend && npm run build`
4. Commit and push:
   ```bash
   git add .
   git commit -m "feat: your feature summary"
   git push origin feature/your-feature-name
   ```
5. Open a Pull Request (PR) against `main`.
