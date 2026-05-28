using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace sagacitysolutions.com.portal.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Project",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Project", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WorkTask",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    ParentId = table.Column<Guid>(type: "uuid", nullable: true),
                    Title = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Hours = table.Column<byte>(type: "smallint", nullable: true),
                    Order = table.Column<byte>(type: "smallint", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkTask", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkTask_Project_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Project",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WorkTask_WorkTask_ParentId",
                        column: x => x.ParentId,
                        principalTable: "WorkTask",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Attachment",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TaskId = table.Column<Guid>(type: "uuid", nullable: false),
                    Url = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Attachment", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Attachment_WorkTask_TaskId",
                        column: x => x.TaskId,
                        principalTable: "WorkTask",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TaskLink",
                columns: table => new
                {
                    TaskId = table.Column<Guid>(type: "uuid", nullable: false),
                    LinkedTaskId = table.Column<Guid>(type: "uuid", nullable: false),
                    LinkType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskLink", x => new { x.TaskId, x.LinkedTaskId });
                    table.ForeignKey(
                        name: "FK_TaskLink_WorkTask_LinkedTaskId",
                        column: x => x.LinkedTaskId,
                        principalTable: "WorkTask",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TaskLink_WorkTask_TaskId",
                        column: x => x.TaskId,
                        principalTable: "WorkTask",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Attachment_TaskId",
                table: "Attachment",
                column: "TaskId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskLink_LinkedTaskId",
                table: "TaskLink",
                column: "LinkedTaskId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkTask_ParentId",
                table: "WorkTask",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkTask_ProjectId",
                table: "WorkTask",
                column: "ProjectId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Attachment");

            migrationBuilder.DropTable(
                name: "TaskLink");

            migrationBuilder.DropTable(
                name: "WorkTask");

            migrationBuilder.DropTable(
                name: "Project");
        }
    }
}
