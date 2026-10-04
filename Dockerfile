# Multi-stage build for CertificateEngine
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /source

# Copy build configuration and project files
COPY Directory.Build.props Directory.Packages.props ./
COPY src/CertificateEngine/ ./src/CertificateEngine/

# Publish release binary
WORKDIR /source/src/CertificateEngine
RUN dotnet publish CertificateEngine.csproj -c Release -o /app

# Final runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app .

# Copy data directory (contains clean SQLite DB with 40 certificates, templates, and CA certs)
COPY data/ ./data/

# Default port configuration (Render assigns $PORT dynamically)
ENV ASPNETCORE_HTTP_PORTS=5000
ENV ASPNETCORE_URLS=http://0.0.0.0:5000
ENV DOTNET_RUNNING_IN_CONTAINER=true

EXPOSE 5000

# Start CertificateEngine in daemon mode
ENTRYPOINT ["dotnet", "CertificateEngine.dll", "--serve"]
