# EAC OSBP Digital Field Guide & Training Platform

Unified full-stack application digitizing the East African Community (EAC) One-Stop Border Post (OSBP) Procedures and Migration Module.

## Architecture

- **Frontend:** Angular 19 (Standalone Components, Signals, Hash Router, Tailwind-styled responsive UI)
- **Backend:** Spring Boot 3 (Java 21, Spring Security with stateless JWT, Spring Data JPA, Apache PDFBox, Swagger/OpenAPI)
- **Database:** PostgreSQL (supports local dev or cloud providers like Render / Supabase / Neon / Heroku with `sslmode=require`)
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

## Deploying to Render (Single Web Service)

1. **Create a PostgreSQL Database on Render:**
   - Go to Render Dashboard -> **New** -> **PostgreSQL**.
   - Copy the **Internal Database URL** (e.g., `postgresql://osbp_user:password@dpg-...-a/osbp_db`).

2. **Deploy the Web Service:**
   - Go to Render Dashboard -> **New** -> **Web Service**.
   - Connect this GitHub repository: `Three-Mountains-_IOM-Projects`.
   - Select **Docker** as the Environment / Runtime.
   - Leave the Dockerfile Path as `Dockerfile` and Docker Build Context as `.`.
   - Instance Type: **Free** (or Starter).

3. **Configure Environment Variables in Render:**
   Under **Environment Variables**, add:
   - `DATABASE_URL`: Paste the PostgreSQL connection URL from step 1.
   - `JWT_SECRET`: A secure random 256-bit string (e.g. `c7f92b45e9821a4f009b7c8d9e2f4a1b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f`).
   - `SPRING_JPA_HIBERNATE_DDL_AUTO`: `update`
   - `PORT`: `8080` (Render handles port routing automatically).

4. **Automatic Database Seeding:**
   - On initial container launch, the Spring Boot `DataSeeder` automatically parses `OSBP MIGRATION MODULE-v 5.4. en.pdf` into structured sections and seeds default admin credentials.
   - Default administrator account:
     - **Email:** `admin@osbp.org`
     - **Password:** `Admin@12345`

---

## Local Development

### 1. Backend
```bash
cd backend
./mvnw spring-boot:run
```
Backend API will be accessible at `http://localhost:8080`.
Swagger UI: `http://localhost:8080/swagger-ui/index.html`

### 2. Frontend
```bash
cd frontend
npm install
npm start
```
Angular dev server will be accessible at `http://localhost:4200` (auto-proxies API requests to `http://localhost:8080`).
