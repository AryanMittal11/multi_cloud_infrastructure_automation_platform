/**
 * Terraform Provisioning Worker
 * Consumes deployment jobs asynchronously from RabbitMQ and executes Terraform
 */

export async function startTerraformWorker() {
  console.log('👷 Terraform Worker service ready to consume queue tasks.');
}

if (require.main === module) {
  startTerraformWorker().catch((err) => {
    console.error('Fatal error in Terraform worker:', err);
    process.exit(1);
  });
}
