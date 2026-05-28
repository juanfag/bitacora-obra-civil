import { ApiProperty } from "@nestjs/swagger";

export class AssignableRolePermissionDto {
  @ApiProperty({ example: "b5c6c3c2-3d4e-4f5a-9b6c-7d8e9f0a1b2c" })
  id: string;

  @ApiProperty({ example: "daily-logs:read" })
  code: string;

  @ApiProperty({ example: "Read daily logs" })
  name: string;

  @ApiProperty({ example: "Allows reading daily log records.", nullable: true })
  description: string | null;
}

export class AssignableRoleDto {
  @ApiProperty({ example: "0f8fad5b-d9cb-469f-a165-70867728950e" })
  id: string;

  @ApiProperty({ example: "PROJECT_MANAGER" })
  code: string;

  @ApiProperty({ example: "Project Manager" })
  name: string;

  @ApiProperty({ example: "Manages project operations.", nullable: true })
  description: string | null;

  @ApiProperty({
    description: "Assignment scope supported by the current role model.",
    example: "PROJECT",
  })
  scope: string;

  @ApiProperty({ type: [AssignableRolePermissionDto] })
  permissions: AssignableRolePermissionDto[];
}
