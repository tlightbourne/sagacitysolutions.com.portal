# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# Copy solution and project files to restore dependencies
COPY sagacitysolutions.com.portal.slnx ./
COPY src/sagacitysolutions.com.portal.Domain/sagacitysolutions.com.portal.Domain.csproj src/sagacitysolutions.com.portal.Domain/
COPY src/sagacitysolutions.com.portal.Application/sagacitysolutions.com.portal.Application.csproj src/sagacitysolutions.com.portal.Application/
COPY src/sagacitysolutions.com.portal.Infrastructure/sagacitysolutions.com.portal.Infrastructure.csproj src/sagacitysolutions.com.portal.Infrastructure/
COPY src/sagacitysolutions.com.portal.WebApi/sagacitysolutions.com.portal.WebApi.csproj src/sagacitysolutions.com.portal.WebApi/

RUN dotnet restore src/sagacitysolutions.com.portal.WebApi/sagacitysolutions.com.portal.WebApi.csproj

# Copy all sources and build
COPY src/ src/
RUN dotnet publish src/sagacitysolutions.com.portal.WebApi/sagacitysolutions.com.portal.WebApi.csproj -c Release -o /out

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /out .
EXPOSE 5092
ENV ASPNETCORE_URLS=http://+:5092
ENTRYPOINT ["dotnet", "sagacitysolutions.com.portal.WebApi.dll"]
