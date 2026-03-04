terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "aalta-terraform-state"
    key            = "state/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "aalta-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "AALTA"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "aalta.org"
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  environment = var.environment
  vpc_cidr    = "10.0.0.0/16"
}

# RDS Module
module "rds" {
  source = "./modules/rds"

  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  db_name            = "aalta"
  db_username        = "aalta_admin"
}

# Redis Module
module "redis" {
  source = "./modules/redis"

  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
}

# S3 Module
module "s3" {
  source = "./modules/s3"

  environment = var.environment
}

# ECS Module
module "ecs" {
  source = "./modules/ecs"

  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids

  database_url = module.rds.connection_string
  redis_url    = module.redis.connection_string
  s3_bucket    = module.s3.documents_bucket_name
}

# CloudFront Module
module "cloudfront" {
  source = "./modules/cloudfront"

  environment = var.environment
  domain_name = var.domain_name
  alb_dns     = module.ecs.alb_dns_name
}

# Monitoring Module
module "monitoring" {
  source = "./modules/monitoring"

  environment   = var.environment
  ecs_cluster   = module.ecs.cluster_name
  rds_instance  = module.rds.instance_id
  redis_cluster = module.redis.cluster_id
}

# Outputs
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "alb_dns" {
  value = module.ecs.alb_dns_name
}

output "cloudfront_distribution" {
  value = module.cloudfront.distribution_domain
}

output "rds_endpoint" {
  value     = module.rds.endpoint
  sensitive = true
}
