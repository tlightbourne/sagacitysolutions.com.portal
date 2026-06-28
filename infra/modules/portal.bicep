// Portal Resources Module
param location string
param environmentName string
param adminUsername string
@secure()
param adminPassword string

var postgresServerName = 'psql-sagacity-${environmentName}'
var caeName = 'cae-sagacity-${environmentName}'
var swaName = 'swa-sagacity-${environmentName}'

// 1. Azure Database for PostgreSQL (Flexible Server - Free 12 Month Eligible B1ms)
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: postgresServerName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: adminUsername
    administratorLoginPassword: adminPassword
    version: '14'
    storage: {
      storageSizeGB: 32
    }
  }
}

// Firewall rule allowing Azure Services to connect to Postgres
resource postgresFirewall 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = {
  parent: postgresServer
  name: 'AllowAllAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Database creation
resource sagacityDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgresServer
  name: 'sagacitysolutions'
}

resource logtoDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgresServer
  name: 'logto'
}

// 2. Azure Static Web App (React 19 Client SPA)
resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: swaName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    buildProperties: {
      appLocation: 'src/sagacitysolutions.com.portal.Client'
      apiLocation: ''
      appArtifactLocation: 'dist'
    }
  }
}

// 3. Azure Container Apps Environment
resource managedEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: caeName
  location: location
  properties: {}
}

// 4. Container App: Logto Identity Server (Core OIDC Server)
resource logtoApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'app-logto'
  location: location
  properties: {
    managedEnvironmentId: managedEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3001
      }
    }
    template: {
      scale: {
        minReplicas: 1
        maxReplicas: 10
      }
      containers: [
        {
          name: 'logto'
          image: 'svhd/logto:1.40.1'
          env: [
            {
              name: 'TRUST_PROXY_HEADER'
              value: 'true'
            }
            {
              name: 'PORT'
              value: '3001'
            }
            {
              name: 'ENDPOINT'
              value: 'https://${logtoApp.properties.configuration.ingress.fqdn}'
            }
            {
              name: 'ADMIN_ENDPOINT'
              value: 'https://${logtoAdminApp.properties.configuration.ingress.fqdn}'
            }
            {
              name: 'DB_URL'
              value: 'postgresql://${adminUsername}:${replace(replace(adminPassword, '&', '%26'), '=', '%3D')}@${postgresServer.properties.fullyQualifiedDomainName}:5432/logto?sslmode=require'
            }
          ]
        }
      ]
    }
  }
}

// 4b. Container App: Logto Admin Console
resource logtoAdminApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'app-logto-admin'
  location: location
  properties: {
    managedEnvironmentId: managedEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3002
      }
    }
    template: {
      scale: {
        minReplicas: 1
        maxReplicas: 10
      }
      containers: [
        {
          name: 'logto-admin'
          image: 'svhd/logto:1.40.1'
          env: [
            {
              name: 'TRUST_PROXY_HEADER'
              value: 'true'
            }
            {
              name: 'PORT'
              value: '3002'
            }
            {
              name: 'ENDPOINT'
              value: 'https://${logtoApp.properties.configuration.ingress.fqdn}'
            }
            {
              name: 'ADMIN_ENDPOINT'
              value: 'https://${logtoAdminApp.properties.configuration.ingress.fqdn}'
            }
            {
              name: 'DB_URL'
              value: 'postgresql://${adminUsername}:${replace(replace(adminPassword, '&', '%26'), '=', '%3D')}@${postgresServer.properties.fullyQualifiedDomainName}:5432/logto?sslmode=require'
            }
          ]
        }
      ]
    }
  }
}

// 5. Container App: .NET 10 Web API
resource webApiApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'app-webapi'
  location: location
  properties: {
    managedEnvironmentId: managedEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 5092
      }
    }
    template: {
      scale: {
        minReplicas: 1
        maxReplicas: 10
      }
      containers: [
        {
          name: 'webapi'
          image: 'mcr.microsoft.com/dotnet/samples:aspnetapp' // Placeholder image until GHCR container built
          env: [
            {
              name: 'ConnectionStrings__DefaultConnection'
              value: 'Host=${postgresServer.properties.fullyQualifiedDomainName};Database=sagacitysolutions;Username=${adminUsername};Password=${adminPassword};SSL Mode=Require;'
            }
          ]
        }
      ]
    }
  }
}

// 6. Container App: Node BFF Gateway
resource bffApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'app-bff'
  location: location
  properties: {
    managedEnvironmentId: managedEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 5000
      }
    }
    template: {
      scale: {
        minReplicas: 1
        maxReplicas: 10
      }
      containers: [
        {
          name: 'bff'
          image: 'node:20-alpine' // Placeholder image until GHCR container built
          env: [
            {
              name: 'PORT'
              value: '5000'
            }
            {
              name: 'CLIENT_ORIGIN'
              value: 'https://${staticWebApp.properties.defaultHostname}'
            }
            {
              name: 'LOGTO_ENDPOINT'
              value: 'https://${logtoApp.properties.configuration.ingress.fqdn}'
            }
            {
              name: 'BASE_URL'
              value: 'https://${bffApp.properties.configuration.ingress.fqdn}'
            }
            {
              name: 'PORTAL_API_URL'
              value: 'https://${webApiApp.properties.configuration.ingress.fqdn}'
            }
            {
              name: 'PORTAL_API_RESOURCE'
              value: 'https://api.sagacitysolutions.ai'
            }
          ]
        }
      ]
    }
  }
}

output staticWebAppDefaultHostName string = staticWebApp.properties.defaultHostname
output containerAppsEnvironmentFqdn string = managedEnv.properties.defaultDomain
