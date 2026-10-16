# ============================================================
# Multi-Stage Dockerfile for OSBP Field Guide
# Packages Angular 19 Frontend + Spring Boot 3 Backend into
# a single, production-grade container for Render deployment.
# ============================================================

# ------------------------------------------------------------
# Stage 1: Build Angular Frontend
# ------------------------------------------------------------
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy dependencies first for Docker layer caching
COPY frontend/package*.json ./
RUN npm ci || npm install

# Copy Angular source code and build production bundle
COPY frontend/ ./
RUN npm run build -- --configuration production

# ------------------------------------------------------------
# Stage 2: Build Spring Boot Backend with Embedded Frontend
# ------------------------------------------------------------
FROM maven:3.9.6-eclipse-temurin-21-alpine AS backend-builder
WORKDIR /app/backend

# Copy Maven POM and pre-fetch dependencies
COPY backend/pom.xml ./
RUN mvn dependency:go-offline -B || true

# Copy backend source code
COPY backend/src ./src

# Copy compiled Angular distribution into Spring Boot's static resources
COPY --from=frontend-builder /app/frontend/dist/angular-field-guide/browser/ ./src/main/resources/static/

# Package executable Spring Boot JAR
RUN mvn clean package -DskipTests

# ------------------------------------------------------------
# Stage 3: Minimal Secure Production Runtime
# ------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# Install fontconfig and fonts if required for PDF/image processing
RUN apk add --no-cache fontconfig ttf-dejavu

# Copy packaged JAR from backend-builder stage
COPY --from=backend-builder /app/backend/target/*.jar app.jar

# Copy PDF manual into container so DataSeeder auto-ingests on a fresh cloud database
COPY ["OSBP MIGRATION MODULE-v 5.4. en.pdf", "./"]

# Protect against Render free tier RAM limits (512MB)
ENV JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

# Default container port (Render overrides PORT at runtime)
ENV PORT=8080
EXPOSE 8080

# Run Spring Boot Application
ENTRYPOINT ["java", "-jar", "app.jar"]
