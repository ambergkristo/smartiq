# ---- build stage ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy pom first for dependency cache
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline

# Copy sources and build
COPY src ./src
RUN mvn -q -DskipTests package

# ---- runtime stage ----
FROM eclipse-temurin:21-jre
WORKDIR /app

# Copy fat jar
COPY --from=build /app/target/*.jar /app/app.jar

# Render provides PORT; default to 8080 for local
ENV PORT=8080

# Health endpoint uses app port
EXPOSE 8080

CMD ["sh","-c","java $JAVA_OPTS -jar /app/app.jar --server.port=${PORT}"]
