-- Preserve the exact deployment (and therefore Terraform state) targeted by
-- each teardown. A destroy run is a separate deployment record and cannot use
-- its own fresh workspace to manage resources created by another deployment.
ALTER TABLE "deployments" ADD COLUMN "targetDeploymentId" TEXT;

CREATE INDEX "deployments_targetDeploymentId_idx" ON "deployments"("targetDeploymentId");

ALTER TABLE "deployments"
ADD CONSTRAINT "deployments_targetDeploymentId_fkey"
FOREIGN KEY ("targetDeploymentId") REFERENCES "deployments"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
