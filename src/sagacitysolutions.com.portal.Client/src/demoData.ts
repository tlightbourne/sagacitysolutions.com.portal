import type { Project, WorkTask } from "./types";

export const DEMO_PROJECTS: Project[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    tenantId: "zzp1s6s0mqqc",
    name: "Acme Corp Cloud Migration",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    tenantId: "zzp1s6s0mqqc",
    name: "Fintech Core Ledger API",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    tenantId: "zzp1s6s0mqqc",
    name: "Logistics Dashboard & Analytics",
  },
];

export const DEMO_TASKS: Record<string, WorkTask[]> = {
  "11111111-1111-1111-1111-111111111111": [
    {
      id: "t1",
      projectId: "11111111-1111-1111-1111-111111111111",
      title: "Set up AWS Landing Zone & IAM Roles",
      description: "Establish multi-account structure on AWS, configuring secure IAM roles and permission boundaries matching enterprise security standards.",
      type: "Research",
      status: "Completed",
      hours: 12,
      order: 1,
      attachments: [
        { id: "a1", taskId: "t1", url: "https://aws.amazon.com", name: "IAM Security Best Practices" }
      ],
      children: [
        { id: "sub1", projectId: "11111111-1111-1111-1111-111111111111", parentId: "t1", title: "Configure AWS Control Tower", type: "Development", status: "Completed", order: 1 }
      ]
    },
    {
      id: "t2",
      projectId: "11111111-1111-1111-1111-111111111111",
      title: "Dockerize existing Node.js Microservices",
      description: "Write custom multi-stage Dockerfiles for the backend gateway, notification-service and auth-service to optimize build speeds and image sizes.",
      type: "Development",
      status: "InProgress",
      hours: 18,
      order: 2,
      children: []
    },
    {
      id: "t3",
      projectId: "11111111-1111-1111-1111-111111111111",
      title: "Configure CI/CD Pipelines with GitHub Actions",
      description: "Automate build, lint, and deploy workflows using GitHub Actions. Secrets management to be securely resolved via OpenID Connect (OIDC).",
      type: "Development",
      status: "NotStarted",
      hours: 8,
      order: 3,
    },
    {
      id: "t4",
      projectId: "11111111-1111-1111-1111-111111111111",
      title: "Performance & Stress Testing on Sandbox",
      description: "Execute load testing using k6 script up to 5,000 requests/sec. Identify bottleneck in database connections pool sizing.",
      type: "Testing",
      status: "OnHold",
      hours: 16,
      order: 4,
    }
  ],
  "22222222-2222-2222-2222-222222222222": [
    {
      id: "t2-1",
      projectId: "22222222-2222-2222-2222-222222222222",
      title: "Double-Entry Ledger Schema Design",
      description: "Design highly-scalable SQL Server database schema for multi-asset transactions ensuring strict mathematical correctness and audit logs.",
      type: "Design",
      status: "Completed",
      hours: 24,
      order: 1,
    },
    {
      id: "t2-2",
      projectId: "22222222-2222-2222-2222-222222222222",
      title: "Implement Transaction Reconciliation Engine",
      description: "Core algorithm in .NET Core that reconciles external bank gateway statements against internal database records daily.",
      type: "Development",
      status: "InProgress",
      hours: 32,
      order: 2,
    }
  ],
  "33333333-3333-3333-3333-333333333333": [
    {
      id: "t3-1",
      projectId: "33333333-3333-3333-3333-333333333333",
      title: "UI Design of Real-time Fleet tracking Map",
      description: "Design high fidelity wireframes and user interaction flows for dynamic fleet locations tracking map dashboard, utilizing Mapbox.",
      type: "Design",
      status: "Completed",
      hours: 14,
      order: 1,
    }
  ]
};
