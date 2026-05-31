using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace sagacitysolutions.com.portal.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CascadeDeleteProjects : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WorkTask_Project_ProjectId",
                table: "WorkTask");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkTask_Project_ProjectId",
                table: "WorkTask",
                column: "ProjectId",
                principalTable: "Project",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WorkTask_Project_ProjectId",
                table: "WorkTask");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkTask_Project_ProjectId",
                table: "WorkTask",
                column: "ProjectId",
                principalTable: "Project",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
