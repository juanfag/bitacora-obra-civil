import { ApiProperty } from "@nestjs/swagger";

export class DashboardMetricsResponseDto {
  @ApiProperty({
    description: "Active projects visible to the authenticated user.",
    example: 12,
  })
  activeProjects!: number;

  @ApiProperty({
    description: "Open daily logs in visible projects.",
    example: 7,
  })
  openDailyLogs!: number;

  @ApiProperty({
    description: "Daily logs pending approval in visible projects.",
    example: 3,
  })
  pendingApprovalDailyLogs!: number;

  @ApiProperty({
    description: "Closed daily logs in visible projects.",
    example: 21,
  })
  closedDailyLogs!: number;

  @ApiProperty({
    description: "Total daily log events in visible projects.",
    example: 156,
  })
  totalEvents!: number;

  @ApiProperty({
    description: "Active users assigned to visible projects.",
    example: 18,
  })
  totalActiveUsers!: number;
}
