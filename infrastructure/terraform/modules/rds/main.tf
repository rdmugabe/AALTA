variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "db_name" {
  type = string
}

variable "db_username" {
  type = string
}

variable "instance_class" {
  type    = string
  default = "db.t3.micro"
}

# Random password for database
resource "random_password" "db_password" {
  length  = 32
  special = false
}

# Store password in Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name = "aalta-${var.environment}-db-password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

# Security Group
resource "aws_security_group" "rds" {
  name        = "aalta-${var.environment}-rds-sg"
  description = "Security group for RDS"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "aalta-${var.environment}-rds-sg"
  }
}

# Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "aalta-${var.environment}-db-subnet"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "aalta-${var.environment}-db-subnet"
  }
}

# Parameter Group
resource "aws_db_parameter_group" "main" {
  family = "postgres16"
  name   = "aalta-${var.environment}-pg16"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  tags = {
    Name = "aalta-${var.environment}-pg16"
  }
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier = "aalta-${var.environment}"

  engine         = "postgres"
  engine_version = "16.1"
  instance_class = var.instance_class

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.main.name

  multi_az               = var.environment == "production"
  publicly_accessible    = false
  deletion_protection    = var.environment == "production"
  skip_final_snapshot    = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "aalta-${var.environment}-final" : null

  backup_retention_period = var.environment == "production" ? 7 : 1
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"

  performance_insights_enabled = var.environment == "production"

  tags = {
    Name = "aalta-${var.environment}-postgres"
  }
}

# Outputs
output "endpoint" {
  value = aws_db_instance.main.endpoint
}

output "instance_id" {
  value = aws_db_instance.main.id
}

output "connection_string" {
  value     = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/${var.db_name}"
  sensitive = true
}

output "security_group_id" {
  value = aws_security_group.rds.id
}
