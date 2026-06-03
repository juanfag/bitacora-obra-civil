import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { DocumentRelationsController } from "./document-relations.controller";
import { DocumentVersionsController } from "./document-versions.controller";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

@Module({
  imports: [AuditModule, AuthModule, ProjectsModule],
  controllers: [
    DocumentsController,
    DocumentRelationsController,
    DocumentVersionsController,
  ],
  providers: [DocumentsService],
})
export class DocumentsModule {}
