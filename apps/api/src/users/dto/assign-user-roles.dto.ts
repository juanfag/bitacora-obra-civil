import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UserRoleAssignmentDto {
  @ApiProperty({ example: "018f63f4-4937-7784-9ef5-5b51f6c02b4a" })
  @IsUUID()
  projectId!: string;

  @ApiProperty({ example: "018f63f4-4937-7784-9ef5-5b51f6c02b4a" })
  @IsUUID()
  roleId!: string;
}

export class AssignUserRolesDto {
  @ApiProperty({
    description:
      "Desired role assignments in the projects managed by the authenticated user.",
    type: [UserRoleAssignmentDto],
  })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => UserRoleAssignmentDto)
  assignments!: UserRoleAssignmentDto[];
}
