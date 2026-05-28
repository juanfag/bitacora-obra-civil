import { ApiProperty } from "@nestjs/swagger";

export class UserOrganizationDto {
  @ApiProperty({ example: "018f63f4-4937-7784-9ef5-5b51f6c02b4a" })
  id!: string;

  @ApiProperty({ example: "Constructora Demo" })
  name!: string;
}

export class UserProjectDto {
  @ApiProperty({ example: "018f63f4-4937-7784-9ef5-5b51f6c02b4a" })
  id!: string;

  @ApiProperty({ example: "PRY-000001" })
  code!: string;

  @ApiProperty({ example: "Proyecto Demo" })
  name!: string;

  @ApiProperty({ example: "ACTIVE" })
  status!: string;

  @ApiProperty({ type: UserOrganizationDto })
  organization!: UserOrganizationDto;
}

export class UserRoleDto {
  @ApiProperty({ example: "018f63f4-4937-7784-9ef5-5b51f6c02b4a" })
  id!: string;

  @ApiProperty({ example: "PROJECT_MANAGER" })
  code!: string;

  @ApiProperty({ example: "Project Manager" })
  name!: string;

  @ApiProperty({ example: "018f63f4-4937-7784-9ef5-5b51f6c02b4a" })
  projectId!: string;

  @ApiProperty({ example: "Proyecto Demo" })
  projectName!: string;
}

export class UserReadDto {
  @ApiProperty({ example: "018f63f4-4937-7784-9ef5-5b51f6c02b4a" })
  id!: string;

  @ApiProperty({ example: "Administrador Demo" })
  name!: string;

  @ApiProperty({ example: "Administrador Demo" })
  fullName!: string;

  @ApiProperty({ example: "admin@bitacora.local" })
  email!: string;

  @ApiProperty({ example: "ACTIVE" })
  status!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ type: [UserRoleDto] })
  roles!: UserRoleDto[];

  @ApiProperty({ type: UserOrganizationDto, nullable: true })
  organization!: UserOrganizationDto | null;

  @ApiProperty({ type: [UserOrganizationDto] })
  organizations!: UserOrganizationDto[];

  @ApiProperty({ type: [UserProjectDto] })
  projects!: UserProjectDto[];

  @ApiProperty({ example: "2026-05-27T15:00:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-05-27T15:00:00.000Z" })
  updatedAt!: string;
}

export class UsersReadMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}

export class UsersReadListResponseDto {
  @ApiProperty({ type: [UserReadDto] })
  items!: UserReadDto[];

  @ApiProperty({ type: UsersReadMetaDto })
  meta!: UsersReadMetaDto;
}
