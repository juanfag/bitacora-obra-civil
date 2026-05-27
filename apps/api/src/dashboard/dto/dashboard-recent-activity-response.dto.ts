import { ApiProperty } from "@nestjs/swagger";

export class DashboardRecentActivityItemDto {
  @ApiProperty({
    description: "Activity item identifier.",
    example: "018f63f4-4937-7784-9ef5-5b51f6c02b4a",
  })
  id!: string;

  @ApiProperty({
    description: "Activity type.",
    example: "DAILY_LOG_APPROVED",
  })
  type!: string;

  @ApiProperty({
    description: "Short activity title.",
    example: "Bitacora aprobada",
  })
  title!: string;

  @ApiProperty({
    description: "Activity description safe for dashboard display.",
    example: "Bitacora del 2026-05-25",
  })
  description!: string;

  @ApiProperty({
    description: "Related project id.",
    nullable: true,
  })
  projectId!: string | null;

  @ApiProperty({
    description: "Related project name.",
    nullable: true,
  })
  projectName!: string | null;

  @ApiProperty({
    description: "User id that performed or reported the activity.",
    nullable: true,
  })
  userId!: string | null;

  @ApiProperty({
    description: "User display name.",
    nullable: true,
  })
  userName!: string | null;

  @ApiProperty({
    description: "Activity timestamp in ISO 8601 format.",
    example: "2026-05-25T14:30:00.000Z",
  })
  createdAt!: string;
}

export class DashboardRecentActivityResponseDto {
  @ApiProperty({
    description: "Maximum requested result count.",
    example: 20,
  })
  limit!: number;

  @ApiProperty({
    description: "Returned recent activity items.",
    type: [DashboardRecentActivityItemDto],
  })
  items!: DashboardRecentActivityItemDto[];
}
