FROM node:22-alpine AS ui
WORKDIR /ui
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build
FROM maven:3.9.9-eclipse-temurin-17 AS backend
WORKDIR /app
COPY backend/pom.xml ./
RUN mvn -B dependency:go-offline
COPY backend/src ./src
COPY --from=ui /ui/out ./src/main/resources/static
RUN mvn -B verify
FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S rescue && adduser -S rescue -G rescue
WORKDIR /app
RUN mkdir data && chown rescue:rescue data
COPY --from=backend /app/target/rescue-net-1.0.0.jar /app/app.jar
USER rescue
EXPOSE 8080
ENV SERVER_ADDRESS=0.0.0.0
ENTRYPOINT ["java","-jar","/app/app.jar"]
