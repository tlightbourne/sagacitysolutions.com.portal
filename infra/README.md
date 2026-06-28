# Sagacity Solutions Portal Infrastructure as Code (Bicep)

This folder contains the declarative **Azure Bicep** Infrastructure as Code (IaC) templates for automated provisioning of the Sagacity Solutions Portal on Microsoft Azure.

## Provisioned Architecture

* **Resource Group**: `rg-sagacity-prod`
* **Database**: Azure Database for PostgreSQL Flexible Server (`Standard_B1ms` tier - 12 months free)
* **Frontend**: Azure Static Web Apps (Free Tier)
* **Container Environment**: Azure Container Apps Environment
  * `app-logto`: Logto OIDC Server Container
  * `app-webapi`: .NET 10 Web API Container
  * `app-bff`: Express Node.js BFF Container

---

## How to Deploy via Azure Cloud Shell or Local Azure CLI

### Step 1: Login to Azure
If using local terminal:
```bash
az login
```

### Step 2: Deploy the Infrastructure Stack
Run the deployment command pointing to your subcription:

```bash
az deployment sub create \
  --location eastus \
  --template-file infra/main.bicep \
  --parameters adminUsername='sagacityadmin' adminPassword='YourSecurePassword123!'
```

---

## Next Steps: GitHub Actions Automated CI/CD
Once provisioned, these templates can be triggered directly inside GitHub Actions using `azure/arm-deploy@v1` for 100% automated continuous infrastructure deployments on git push.
