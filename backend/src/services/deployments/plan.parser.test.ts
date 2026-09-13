import { planParser } from './plan.parser';

describe('PlanParser Subsystem', () => {
  it('should parse standard Terraform plan output with canonical summary line', () => {
    const rawOutput = `
Terraform used the selected providers to generate the following execution plan.
Resource actions are indicated with the following symbols:
  + create
  ~ update in-place
  - destroy

Terraform will perform the following actions:

  # aws_vpc.main will be created
  + resource "aws_vpc" "main" {
      + cidr_block = "10.0.0.0/16"
      + id         = (known after apply)
    }

  # aws_subnet.public[0] will be created
  + resource "aws_subnet" "public" {
      + cidr_block = "10.0.1.0/24"
    }

  # aws_security_group.web will be updated in-place
  ~ resource "aws_security_group" "web" {
        name = "web-sg"
      ~ description = "Old" -> "New"
    }

Plan: 2 to add, 1 to change, 0 to destroy.
`;

    const summary = planParser.parsePlanOutput(rawOutput);

    expect(summary.toAdd).toBe(2);
    expect(summary.toChange).toBe(1);
    expect(summary.toDestroy).toBe(0);
    expect(summary.isDestructive).toBe(false);
    expect(summary.resourceActions).toHaveLength(3);

    expect(summary.resourceActions[0]).toEqual({
      address: 'aws_vpc.main',
      type: 'aws_vpc',
      name: 'main',
      action: 'create',
      changeSymbol: '+',
    });

    expect(summary.resourceActions[1]).toEqual({
      address: 'aws_subnet.public[0]',
      type: 'aws_subnet',
      name: 'public[0]',
      action: 'create',
      changeSymbol: '+',
    });

    expect(summary.resourceActions[2]).toEqual({
      address: 'aws_security_group.web',
      type: 'aws_security_group',
      name: 'web',
      action: 'update',
      changeSymbol: '~',
    });
  });

  it('should detect destructive changes and mark isDestructive true', () => {
    const rawOutput = `
Terraform will perform the following actions:

  # aws_db_instance.db will be destroyed
  - resource "aws_db_instance" "db" {
      - id = "rds-12345"
    }

  # aws_instance.web will be replaced
-/+ resource "aws_instance" "web" {
      ~ ami = "ami-old" -> "ami-new"
    }

Plan: 1 to add, 0 to change, 2 to destroy.
`;

    const summary = planParser.parsePlanOutput(rawOutput);

    expect(summary.toAdd).toBe(1);
    expect(summary.toChange).toBe(0);
    expect(summary.toDestroy).toBe(2);
    expect(summary.isDestructive).toBe(true);
    expect(summary.resourceActions).toHaveLength(2);
    expect(summary.resourceActions[0].action).toBe('destroy');
    expect(summary.resourceActions[1].action).toBe('replace');
    expect(summary.resourceActions[1].changeSymbol).toBe('-/+');
  });

  it('should gracefully handle null or empty outputs', () => {
    const emptySummary = planParser.parsePlanOutput('');
    expect(emptySummary).toEqual({
      toAdd: 0,
      toChange: 0,
      toDestroy: 0,
      resourceActions: [],
      isDestructive: false,
    });

    const nullSummary = planParser.parsePlanOutput(null);
    expect(nullSummary).toEqual({
      toAdd: 0,
      toChange: 0,
      toDestroy: 0,
      resourceActions: [],
      isDestructive: false,
    });
  });

  it('should fallback to counting parsed resource actions if summary line is missing', () => {
    const rawOutput = `
  # aws_s3_bucket.bucket will be created
  # aws_instance.server will be updated in-place
`;

    const summary = planParser.parsePlanOutput(rawOutput);

    expect(summary.toAdd).toBe(1);
    expect(summary.toChange).toBe(1);
    expect(summary.toDestroy).toBe(0);
    expect(summary.isDestructive).toBe(false);
  });
});
